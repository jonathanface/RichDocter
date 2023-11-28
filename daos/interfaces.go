package daos

import (
	"RichDocter/models"
)

type DaoInterface interface {
	// GETs
	GetAllStories(email string) ([]*models.Story, error)
	GetAllStandalone(email string) ([]*models.Story, error)
	GetAllSeriesWithStories(email string) ([]models.Series, error)
	GetChaptersByStoryID(storyID string) ([]models.Chapter, error)
	GetStoryByID(email string, storyID string) (*models.Story, error)
	GetSeriesByID(email string, seriesID string) (*models.Series, error)
	GetStoryCountByUser(email string) (int, error)
	GetStoryParagraphs(storyID string, chapterID string, startKey string) (*models.BlocksData, error)
	GetStoryOrSeriesAssociations(email, storyID string, needDetails bool) ([]*models.Association, error)
	GetSeriesVolumes(email string, seriesID string) ([]*models.Story, error)
	GetUserDetails(email string) (*models.UserInfo, error)

	// PUTs
	UpsertUser(email string) error
	UpdateUser(user models.UserInfo) error
	RestoreAutomaticallyDeletedStories(email string) error
	ResetBlockOrder(storyID string, storyBlocks *models.StoryBlocks) error
	WriteBlocks(storyID string, storyBlocks *models.StoryBlocks) error
	WriteAssociations(email, storyOrSeriesID string, associations []*models.Association) error
	UpdateAssociationPortraitEntryInDB(email, storyOrSeriesID, associationName, url string) error
	AddCustomerID(email, customerID *string) error
	AddSubscriptionID(email, subscriptionID *string) error
	EditStory(email string, story models.Story) (models.Story, error)
	EditSeries(email string, series models.Series) (models.Series, error)
	RemoveStoryFromSeries(email, storyID string, series models.Series) (models.Series, error)

	// POSTs
	CreateChapter(storyID string, chapter models.Chapter) (models.Chapter, error)
	CreateStory(email string, story models.Story, newSeriesTitle string) (storyID string, err error)
	CreateUser(email string) error

	// DELETEs
	DeleteStoryParagraphs(storyID string, storyBlocks *models.StoryBlocks) error
	DeleteAssociations(email, storyID string, associations []*models.Association) error
	DeleteChapters(storyID string, chapters []models.Chapter) error
	SoftDeleteStory(email, storyID string, isAutomated bool) error
	hardDeleteStory(email, storyID string) error
	DeleteSeries(email string, series models.Series) error

	// HELPERS
	WasStoryDeleted(email string, storyID string) (bool, error)
	IsStoryInASeries(email string, storyID string) (string, error)
	IsUserSubscribed(email string) (string, error)
	GetTotalCreatedStories(email string) (int, error)
	CheckForSuspendedStories(email string) (bool, error)
	CheckTableStatus(tableName string) (string, error)
}
