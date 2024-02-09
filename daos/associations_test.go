package daos_test

import (
	"RichDocter/daos"
	"RichDocter/models"
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/smithy-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestWriteAssociations(t *testing.T) {
	txnCanceledErr := &types.TransactionCanceledException{
		CancellationReasons: []types.CancellationReason{
			{
				Code:    aws.String("ConditionalCheckFailed"),
				Message: aws.String("Example failure message"),
			},
		},
	}

	opErr := &smithy.OperationError{
		ServiceID:     "DynamoDB",
		OperationName: "TransactWriteItems",
		Err:           txnCanceledErr,
	}

	testCases := []struct {
		name                   string // name of the test case
		email, storyOrSeriesID string // inputs
		setupMock              func(*daos.MockDynamoDBClient)
		associations           []*models.Association
		expectError            bool
	}{
		{
			"happy path",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, nil).Twice()
			},
			[]*models.Association{{
				ID: "1234",
			}},
			false,
		},
		{
			"emtpy associations",
			"test@test.com",
			"12345",
			nil,
			[]*models.Association{},
			true,
		},
		{
			"non-aws error on update item",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, fmt.Errorf("some error")).Once()
			},
			[]*models.Association{{
				ID: "1234",
			}},
			true,
		},
		{
			"aws error on update item",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, opErr).Once()

			},
			[]*models.Association{{
				ID: "1234",
			}},
			true,
		},
		{
			"non-aws error on update item details",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, nil).Once()
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, fmt.Errorf("some error")).Once()
			},
			[]*models.Association{{
				ID: "1234",
			}},
			true,
		},
		{
			"aws error on update item details",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, nil).Once()
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, opErr).Once()
			},
			[]*models.Association{{
				ID: "1234",
			}},
			true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			dao := daos.NewMock()
			if tc.setupMock != nil {
				tc.setupMock(dao.DynamoClient.(*daos.MockDynamoDBClient))
			}
			results := dao.WriteAssociations(tc.email, tc.storyOrSeriesID, tc.associations)
			if tc.expectError {
				assert.Error(t, results)
			} else {
				assert.NoError(t, results)
			}
		})
	}
}

func TestUpdateAssociationPortraitEntryInDB(t *testing.T) {
	testCases := []struct {
		name                                       string // name of the test case
		email, storyOrSeriesID, associationID, url string // inputs
		setupMock                                  func(*daos.MockDynamoDBClient)
		expectError                                bool
	}{
		{
			"happy path",
			"test@test.com",
			"12345",
			"seriesID",
			"http://www.google.com",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("UpdateItem", mock.Anything, mock.AnythingOfType("*dynamodb.UpdateItemInput"), mock.Anything).Return(&dynamodb.UpdateItemOutput{}, nil).Once()
			},
			false,
		},
		{
			"db error",
			"test@test.com",
			"12345",
			"seriesID",
			"http://www.google.com",
			func(cl *daos.MockDynamoDBClient) {
				cl.On("UpdateItem", mock.Anything, mock.AnythingOfType("*dynamodb.UpdateItemInput"), mock.Anything).Return(&dynamodb.UpdateItemOutput{}, fmt.Errorf("some error")).Once()
			},
			true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			dao := daos.NewMock()
			if tc.setupMock != nil {
				tc.setupMock(dao.DynamoClient.(*daos.MockDynamoDBClient))
			}
			results := dao.UpdateAssociationPortraitEntryInDB(tc.email, tc.storyOrSeriesID, tc.associationID, tc.url)
			if tc.expectError {
				assert.Error(t, results)
			} else {
				assert.NoError(t, results)
			}
		})
	}
}

func TestDeleteAssociations(t *testing.T) {
	// txnCanceledErr := &types.TransactionCanceledException{
	// 	CancellationReasons: []types.CancellationReason{
	// 		{
	// 			Code:    aws.String("ConditionalCheckFailed"),
	// 			Message: aws.String("Example failure message"),
	// 		},
	// 	},
	// }

	// opErr := &smithy.OperationError{
	// 	ServiceID:     "DynamoDB",
	// 	OperationName: "TransactWriteItems",
	// 	Err:           txnCanceledErr,
	// }

	testCases := []struct {
		name           string // name of the test case
		email, storyID string // inputs
		setupMock      func(*daos.MockDynamoDBClient)
		associations   []*models.Association
		expectError    bool
	}{
		{
			"happy path",
			"test@test.com",
			"12345",
			func(cl *daos.MockDynamoDBClient) {
				//d.DynamoClient.Scan(context.TODO(), scanInput)
				cl.On("Scan", mock.Anything, mock.AnythingOfType("*dynamodb.ScanInput"), mock.Anything).Return(&dynamodb.ScanOutput{Items: []map[string]types.AttributeValue{
					{
						"user": &types.AttributeValueMemberS{Value: "1"},
					},
				}}, nil).Once()
				cl.On("Scan", mock.Anything, mock.AnythingOfType("*dynamodb.ScanInput"), mock.Anything).Return(&dynamodb.ScanOutput{Items: []map[string]types.AttributeValue{
					{
						"story": &types.AttributeValueMemberS{Value: "1"},
					},
				}}, nil).Once()
				cl.On("Scan", mock.Anything, mock.AnythingOfType("*dynamodb.ScanInput"), mock.Anything).Return(&dynamodb.ScanOutput{}, nil).Once()
				cl.On("TransactWriteItems", mock.Anything, mock.AnythingOfType("*dynamodb.TransactWriteItemsInput"), mock.Anything).Return(&dynamodb.TransactWriteItemsOutput{}, nil).Twice()
			},
			[]*models.Association{{
				ID: "1234",
			}},
			false,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			dao := daos.NewMock()
			if tc.setupMock != nil {
				tc.setupMock(dao.DynamoClient.(*daos.MockDynamoDBClient))
			}
			results := dao.DeleteAssociations(tc.email, tc.storyID, tc.associations)
			if tc.expectError {
				assert.Error(t, results)
			} else {
				assert.NoError(t, results)
			}
		})
	}
}
