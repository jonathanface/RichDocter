package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/gorilla/mux"
)

func RewriteBlockOrderEndpoint(w http.ResponseWriter, r *http.Request) {
	var (
		err        error
		story      string
		awsStatus  int
		awsMessage string
	)
	if story, err = url.PathUnescape(mux.Vars(r)["story"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story name")
		return
	}
	if story == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story ID")
		return
	}

	decoder := json.NewDecoder(r.Body)
	storyBlocks := StoryBlocks{}
	if err := decoder.Decode(&storyBlocks); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Group the storyBlocks into batches of 50.
	batches := make([][]StoryBlock, 0, (len(storyBlocks.Blocks)+(writeBatchSize-1))/writeBatchSize)
	for i := 0; i < len(storyBlocks.Blocks); i += writeBatchSize {
		end := i + writeBatchSize
		if end > len(storyBlocks.Blocks) {
			end = len(storyBlocks.Blocks)
		}
		batches = append(batches, storyBlocks.Blocks[i:end])
	}

	// Loop through the items and create the transaction write items.
	for _, batch := range batches {
		writeItemsInput := &dynamodb.TransactWriteItemsInput{
			ClientRequestToken: nil,
			TransactItems:      make([]types.TransactWriteItem, len(batch)),
		}
		for i, item := range batch {
			// Create a key for the item.
			key := map[string]types.AttributeValue{
				"keyID": &types.AttributeValueMemberS{Value: item.KeyID},
				"story": &types.AttributeValueMemberS{Value: story},
			}
			// Create an update input for the item.
			updateInput := &types.Update{
				TableName:        aws.String("blocks"),
				Key:              key,
				UpdateExpression: aws.String("set place=:p"),
				ExpressionAttributeValues: map[string]types.AttributeValue{
					":p": &types.AttributeValueMemberN{Value: string(item.Place)},
				},
			}

			// Create a transaction write item for the update operation.
			writeItem := types.TransactWriteItem{
				Update: updateInput,
			}

			// Add the transaction write item to the list of transaction write items.
			writeItemsInput.TransactItems[i] = writeItem
		}
		awsStatus, awsMessage = awsWriteTransaction(writeItemsInput)
		if awsStatus != http.StatusOK {
			RespondWithError(w, awsStatus, awsMessage)
			return
		}
	}

	type answer struct {
		Success     bool `json:"success"`
		NumberWrote int  `json:"wrote"`
	}
	RespondWithJson(w, http.StatusOK, answer{Success: true})
}

func WriteBlocksToStoryEndpoint(w http.ResponseWriter, r *http.Request) {
	var (
		email      string
		err        error
		story      string
		awsStatus  int
		awsMessage string
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if story, err = url.PathUnescape(mux.Vars(r)["story"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story name")
		return
	}
	if story == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story ID")
		return
	}
	decoder := json.NewDecoder(r.Body)
	storyBlocks := []StoryBlock{}
	if err = decoder.Decode(&storyBlocks); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Group the storyBlocks into batches of 50.
	batches := make([][]StoryBlock, 0, (len(storyBlocks)+(writeBatchSize-1))/writeBatchSize)
	for i := 0; i < len(storyBlocks); i += writeBatchSize {
		end := i + writeBatchSize
		if end > len(storyBlocks) {
			end = len(storyBlocks)
		}
		batches = append(batches, storyBlocks[i:end])
	}

	numWrote := 0
	now := strconv.FormatInt(time.Now().Unix(), 10)

	// Loop through the items and create the transaction write items.
	for _, batch := range batches {
		writeItemsInput := &dynamodb.TransactWriteItemsInput{
			ClientRequestToken: nil,
			TransactItems:      make([]types.TransactWriteItem, len(batch)),
		}
		for i, item := range batch {
			// Create a key for the item.
			key := map[string]types.AttributeValue{
				"keyID": &types.AttributeValueMemberS{Value: item.KeyID},
				"story": &types.AttributeValueMemberS{Value: story},
			}
			// Create an update input for the item.
			updateInput := &types.Update{
				TableName:        aws.String("blocks"),
				Key:              key,
				UpdateExpression: aws.String("set created_at=if_not_exists(created_at,:t), author=:e, chunk=:c, place=:p"),
				ExpressionAttributeValues: map[string]types.AttributeValue{
					":t": &types.AttributeValueMemberN{Value: now},
					":c": &types.AttributeValueMemberS{Value: string(item.Chunk)},
					":e": &types.AttributeValueMemberS{Value: email},
					":p": &types.AttributeValueMemberN{Value: item.Place},
				},
			}

			// Create a transaction write item for the update operation.
			writeItem := types.TransactWriteItem{
				Update: updateInput,
			}

			// Add the transaction write item to the list of transaction write items.
			writeItemsInput.TransactItems[i] = writeItem
		}
		awsStatus, awsMessage = awsWriteTransaction(writeItemsInput)
		if awsStatus != http.StatusOK {
			RespondWithError(w, awsStatus, awsMessage)
			return
		}
		numWrote += len(batch)
	}

	type answer struct {
		Success     bool `json:"success"`
		NumberWrote int  `json:"wrote"`
	}
	RespondWithJson(w, http.StatusOK, answer{Success: true, NumberWrote: len(storyBlocks)})
}

func WriteAssocationsEndpoint(w http.ResponseWriter, r *http.Request) {
	var (
		email      string
		err        error
		story      string
		awsStatus  int
		awsMessage string
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if story, err = url.PathUnescape(mux.Vars(r)["story"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story name")
		return
	}
	if story == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story ID")
		return
	}
	decoder := json.NewDecoder(r.Body)
	associations := []Association{}
	if err = decoder.Decode(&associations); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	fmt.Println("ass", associations)

	// Group the storyBlocks into batches of 50.
	batches := make([][]Association, 0, (len(associations)+(writeBatchSize-1))/writeBatchSize)
	for i := 0; i < len(associations); i += writeBatchSize {
		end := i + writeBatchSize
		if end > len(associations) {
			end = len(associations)
		}
		batches = append(batches, associations[i:end])
	}

	numWrote := 0
	now := strconv.FormatInt(time.Now().Unix(), 10)

	// Loop through the items and create the transaction write items.
	for _, batch := range batches {
		writeItemsInput := &dynamodb.TransactWriteItemsInput{
			ClientRequestToken: nil,
			TransactItems:      make([]types.TransactWriteItem, len(batch)),
		}
		for i, item := range batch {
			// Create a key for the item.
			key := map[string]types.AttributeValue{
				"association_name": &types.AttributeValueMemberS{Value: item.Name},
				"story":            &types.AttributeValueMemberS{Value: story},
			}
			// Create an update input for the item.
			updateInput := &types.Update{
				TableName:        aws.String("associations"),
				Key:              key,
				UpdateExpression: aws.String("set created_at=if_not_exists(created_at,:t), author=:e, association_type=:at, case_sensitive=:c"),
				ExpressionAttributeValues: map[string]types.AttributeValue{
					":t":  &types.AttributeValueMemberN{Value: now},
					":e":  &types.AttributeValueMemberS{Value: email},
					":at": &types.AttributeValueMemberS{Value: item.Type},
					":c":  &types.AttributeValueMemberBOOL{Value: true},
				},
			}

			// Create a transaction write item for the update operation.
			writeItem := types.TransactWriteItem{
				Update: updateInput,
			}

			// Add the transaction write item to the list of transaction write items.
			writeItemsInput.TransactItems[i] = writeItem
		}
		awsStatus, awsMessage = awsWriteTransaction(writeItemsInput)
		if awsStatus != http.StatusOK {
			RespondWithError(w, awsStatus, awsMessage)
			return
		}
		numWrote += len(batch)
	}

	type answer struct {
		Success     bool `json:"success"`
		NumberWrote int  `json:"wrote"`
	}
	RespondWithJson(w, http.StatusOK, answer{Success: true, NumberWrote: len(associations)})
}