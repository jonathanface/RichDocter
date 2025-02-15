package models

import (
	"encoding/json"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type Chunk struct {
	Key  string `json:"key"`
	Type string `json:"type"`
	Text string `json:"text"`
}

type StoryBlock struct {
	KeyID string          `json:"key_id" dynamodbav:"key_id"`
	Chunk json.RawMessage `json:"chunk" dynamodbav:"chunk"`
	Place string          `json:"place" dynamodbav:"place"`
}
type StoryBlocks struct {
	StoryID   string       `json:"story_id" dynamodbav:"story_id"`
	ChapterID string       `json:"chapter_id"`
	Blocks    []StoryBlock `json:"blocks" dynamodbav:"blocks"`
}

type AssociationDetails struct {
	ExtendedDescription string `json:"extended_description" dynamodbav:"extended_description"`
	CaseSensitive       bool   `json:"case_sensitive" dynamodbav:"case_sensitive"`
	Aliases             string `json:"aliases" dynamodbav:"aliases"`
}

type Association struct {
	ID               string             `json:"association_id" dynamodbav:"association_id"`
	Name             string             `json:"association_name" dynamodbav:"association_name"`
	Type             string             `json:"association_type" dynamodbav:"association_type"`
	Portrait         string             `json:"portrait" dynamodbav:"portrait"`
	ShortDescription string             `json:"short_description" dynamodbav:"short_description"`
	Details          AssociationDetails `json:"details"`
}

type SimplifiedAssociation struct {
	ID               string `json:"association_id" dynamodbav:"association_id"`
	Name             string `json:"association_name" dynamodbav:"association_name"`
	Type             string `json:"association_type" dynamodbav:"association_type"`
	Portrait         string `json:"portrait" dynamodbav:"portrait"`
	ShortDescription string `json:"short_description" dynamodbav:"short_description"`
	CaseSensitive    bool   `json:"case_sensitive" dynamodbav:"case_sensitive"`
	Aliases          string `json:"aliases" dynamodbav:"aliases"`
}

type Chapter struct {
	ID        string `json:"id" dynamodbav:"chapter_id"`
	StoryID   string `json:"story_id" dynamodbav:"story_id"`
	Place     int    `json:"place" dynamodbav:"chapter_num"`
	Title     string `json:"title" dynamodbav:"title"`
	BackupARN string `dynamodbav:"bup_arn"`
}

type ChapterWithContents struct {
	Chapter Chapter     `json:"chapter"`
	Blocks  *BlocksData `json:"blocks"`
}

type Story struct {
	ID          string    `json:"story_id" dynamodbav:"story_id"`
	CreatedAt   int       `json:"created_at" dynamodbav:"created_at"`
	Title       string    `json:"title" dynamodbav:"title"`
	Description string    `json:"description" dynamodbav:"description"`
	SeriesID    string    `json:"series_id" dynamodbav:"series_id"`
	Chapters    []Chapter `json:"chapters"`
	Place       int       `json:"place"`
	ImageURL    string    `json:"image_url" dynamodbav:"image_url"`
}
type BlocksData struct {
	LastEvaluated map[string]types.AttributeValue   `json:"last_evaluated_key"`
	ScannedCount  int32                             `json:"scanned_count"`
	Items         []map[string]types.AttributeValue `json:"items"`
}

type FullStoryContent struct {
	StoryTitle           string                `json:"story_title"`
	ChaptersWithContents []ChapterWithContents `json:"chapters_with_contents"`
}

type Series struct {
	ID          string    `json:"series_id" dynamodbav:"series_id"`
	Title       string    `json:"series_title" dynamodbav:"title"`
	Description string    `json:"series_description" dynamodbav:"description"`
	Stories     []*Story  `json:"stories"`
	CreatedAt   time.Time `json:"created_at" dynamodbav:"created_at"`
	ImageURL    string    `json:"image_url" dynamodbav:"image_url"`
}

type UserInfo struct {
	Email          string `json:"email" dynamodbav:"email"`
	FirstName      string `json:"first_name" dynamodbav:"first_name"`
	Admin          bool   `json:"admin" dynamodbav:"admin"`
	SubscriptionID string `json:"subscription_id" dynamodbav:"subscription_id"`
	CustomerID     string `json:"customer_id" dynamodbav:"customer_id"`
	Expired        bool   `json:"expired" dynamodbav:"expired"`
	Renewing       bool   `json:"renewing" dynamodbav:"renewing"`
	AuthType       string `json:"auth_type"`
}

type Answer struct {
	Success     bool   `json:"success"`
	NumberWrote int    `json:"wrote"`
	URL         string `json:"url"`
}

type AwsStatusResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

type HTMLData struct {
	Chapter string `json:"chapter"`
	HTML    string `json:"html"`
}

type DocumentExportRequest struct {
	StoryID       string     `json:"story_id"`
	HtmlByChapter []HTMLData `json:"html_by_chapter"`
	Type          string     `json:"type"`
	Title         string     `json:"title"`
}
