package daos

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/smithy-go"
)

func (d *DAO) awsWriteTransaction(writeItemsInput *dynamodb.TransactWriteItemsInput) (statusCode int, awsError string) {
	if writeItemsInput == nil {
		return http.StatusBadRequest, "writeItemsInput is nil"
	}
	maxItemsPerSecond := d.capacity / 2

	for numRetries := 0; numRetries < d.maxRetries; numRetries++ {
		if _, err := d.dynamoClient.TransactWriteItems(context.Background(), writeItemsInput); err == nil {
			return http.StatusOK, ""
		} else if opErr, ok := err.(*smithy.OperationError); ok {
			var txnErr *types.TransactionCanceledException
			if errors.As(opErr.Unwrap(), &txnErr) && txnErr.CancellationReasons != nil {
				for _, reason := range txnErr.CancellationReasons {

					if *reason.Code == "ConditionalCheckFailed" {
						return http.StatusConflict, *reason.Message
					}
					// For other types of cancellation reasons, we retry.
					if *reason.Code == "TransactionConflict" || *reason.Code == "CapacityExceededException" {
						var delay time.Duration
						if reason.Code == aws.String("CapacityExceededException") {
							delay = time.Duration(float64(time.Second) / float64(maxItemsPerSecond))
						} else {
							delay = time.Duration((1 << uint(numRetries)) * time.Millisecond)
						}
						time.Sleep(delay)
						break
					} else if *reason.Code != "None" {
						var code int
						if code, err = strconv.Atoi(*reason.Code); err != nil {
							return http.StatusInternalServerError, *reason.Message
						}
						return code, fmt.Sprintf("transaction cancelled: %s", *reason.Message)
					}
				}
			} else {
				return http.StatusInternalServerError, opErr.Error()
			}
		} else {
			return http.StatusInternalServerError, err.Error()
		}
	}
	return http.StatusTooManyRequests, fmt.Sprintf("transaction cancelled after %d retries", d.maxRetries)
}

func (d *DAO) generateStoryChapterTransaction(email string, story string, chapter int, chapterTitle string) (types.TransactWriteItem, error) {
	if email == "" || story == "" || chapterTitle == "" {
		return types.TransactWriteItem{}, fmt.Errorf("CHAPTER CREATION: Email, story, and chapterTitle params must not be blank")
	}
	chapterNumStr := strconv.Itoa(chapter)

	input := types.TransactWriteItem{
		Update: &types.Update{
			TableName: aws.String("chapters"),
			Key: map[string]types.AttributeValue{
				"chapter_title": &types.AttributeValueMemberS{Value: chapterTitle},
				"story_title":   &types.AttributeValueMemberS{Value: story},
			},
			ConditionExpression: aws.String("attribute_not_exists(series_title) AND attribute_not_exists(story_title)"),
			UpdateExpression:    aws.String("set chapter_num=:n, author=:a"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":n": &types.AttributeValueMemberN{Value: chapterNumStr},
				":a": &types.AttributeValueMemberS{Value: email},
			},
		},
	}
	return input, nil
}

func (d *DAO) createBlockTable(email string, story string, chapterTitle string, chapterNum int) error {
	if email == "" || story == "" || chapterTitle == "" {
		return fmt.Errorf("BLOCKS TABLE CREATION: Email, story, and chapter params must not be blank")
	}
	email = strings.ToLower(strings.ReplaceAll(email, "@", "-"))
	story = strings.ToLower(strings.ReplaceAll(story, " ", "-"))
	chapter := strconv.Itoa(chapterNum)
	tableName := email + "_" + story + "_" + chapter + "_blocks"
	partitionKey := aws.String("key_id")
	gsiPartKey := aws.String("story")
	gsiSortKey := aws.String("place")

	tableSchema := []types.KeySchemaElement{
		{
			AttributeName: partitionKey,
			KeyType:       types.KeyTypeHash,
		},
	}

	gsiSchema := []types.KeySchemaElement{
		{
			AttributeName: gsiPartKey,
			KeyType:       types.KeyTypeHash,
		},
		{
			AttributeName: gsiSortKey,
			KeyType:       types.KeyTypeRange,
		},
	}

	attributes := []types.AttributeDefinition{
		{
			AttributeName: partitionKey,
			AttributeType: types.ScalarAttributeTypeS,
		},
		{
			AttributeName: gsiPartKey,
			AttributeType: types.ScalarAttributeTypeS,
		},
		{
			AttributeName: gsiSortKey,
			AttributeType: types.ScalarAttributeTypeN,
		},
	}

	gsiSettings := []types.GlobalSecondaryIndex{
		{
			IndexName: aws.String("story-place-index"),
			KeySchema: gsiSchema,
			Projection: &types.Projection{
				ProjectionType: types.ProjectionTypeAll,
			},
		},
	}

	_, err := d.dynamoClient.CreateTable(context.TODO(), &dynamodb.CreateTableInput{
		TableName:              aws.String(tableName),
		KeySchema:              tableSchema,
		AttributeDefinitions:   attributes,
		BillingMode:            types.BillingModePayPerRequest,
		GlobalSecondaryIndexes: gsiSettings,
	})

	if err != nil {
		return err
	} /*else {
		waiter := dynamodb.NewTableExistsWaiter(AwsClient)
		if err = waiter.Wait(context.TODO(), &dynamodb.DescribeTableInput{
			TableName: aws.String(tableName),
		}, 1*time.Minute); err != nil {
			return err
		}
	}*/
	return nil
}
