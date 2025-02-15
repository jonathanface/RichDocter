package api

import (
	ctxkey "RichDocter/ctxkeys"
	"RichDocter/daos"
	"RichDocter/models"
	"RichDocter/sessions"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/aws/smithy-go"
	"github.com/gorilla/mux"
)

func ChapterDetailsEndpoint(w http.ResponseWriter, r *http.Request) {
	var (
		storyID, chapterID string
		err                error
		dao                daos.DaoInterface
		ok                 bool
	)

	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story ID")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story id")
		return
	}
	if chapterID, err = url.PathUnescape(mux.Vars(r)["chapterID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing chapter ID")
		return
	}
	if chapterID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing chapter id")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	var chapter *models.Chapter
	chapter, err = dao.GetChapterByID(chapterID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondWithJson(w, http.StatusOK, chapter)
}

func StoryBlocksEndPoint(w http.ResponseWriter, r *http.Request) {
	chapterID := r.URL.Query().Get("chapter")
	var (
		email   string
		err     error
		storyID string
		dao     daos.DaoInterface
		ok      bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story ID")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story ID")
		return
	}
	if chapterID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing chapter ID")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	if ok, err = dao.WasStoryDeleted(email, storyID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ok {
		RespondWithError(w, http.StatusNotFound, "story not found")
		return
	}
	blocks, err := dao.GetChapterParagraphs(storyID, chapterID, nil)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if blocks == nil || len(blocks.Items) == 0 {
		RespondWithError(w, http.StatusNotFound, "no content")
		return
	}
	RespondWithJson(w, http.StatusOK, blocks)
}

func FullStoryEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email   string
		err     error
		storyID string
		dao     daos.DaoInterface
		ok      bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story ID")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story id")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	if ok, err = dao.WasStoryDeleted(email, storyID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ok {
		RespondWithError(w, http.StatusNotFound, "story not found")
		return
	}

	story, err := dao.GetStoryByID(email, storyID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "story not found")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	fullStory := models.FullStoryContent{}
	fullStory.StoryTitle = story.Title

	for _, chap := range story.Chapters {
		chapWithContents := models.ChapterWithContents{}
		chapWithContents.Chapter = chap
		chapWithContents.Blocks, err = staggeredStoryBlockRetrieval(dao, storyID, chap.ID, nil, nil)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		fullStory.ChaptersWithContents = append(fullStory.ChaptersWithContents, chapWithContents)
	}
	RespondWithJson(w, http.StatusOK, fullStory)
}

func StoryEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email   string
		err     error
		storyID string
		dao     daos.DaoInterface
		ok      bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story name")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story id")
		return
	}

	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	if ok, err = dao.WasStoryDeleted(email, storyID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ok {
		RespondWithError(w, http.StatusNotFound, "story not found")
		return
	}
	story, err := dao.GetStoryByID(email, storyID)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "story not found")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondWithJson(w, http.StatusOK, story)
}

func AllStandaloneStoriesEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email string
		err   error
		dao   daos.DaoInterface
		ok    bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	userDetails, err := dao.GetUserDetails(email)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	stories, err := dao.GetAllStandalone(email, userDetails.Admin)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondWithJson(w, http.StatusOK, stories)
}

func AssociationDetailsEndpoint(w http.ResponseWriter, r *http.Request) {
	var (
		email         string
		storyID       string
		err           error
		associationID string
		dao           daos.DaoInterface
		ok            bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story id")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story id")
		return
	}
	if associationID, err = url.PathUnescape(mux.Vars(r)["associationID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing association id")
		return
	}
	if associationID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing association id")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	association, err := dao.GetAssociationDetails(email, storyID, associationID)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondWithJson(w, http.StatusOK, association)
}

func AllAssociationThumbnailsByStoryEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email   string
		err     error
		storyID string
		dao     daos.DaoInterface
		ok      bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if storyID, err = url.PathUnescape(mux.Vars(r)["storyID"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing story id")
		return
	}
	if storyID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing story id")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	associations, err := dao.GetStoryOrSeriesAssociationThumbnails(email, storyID, true)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(associations) == 0 {
		RespondWithError(w, http.StatusNotFound, "no associations found for this story")
		return
	}
	RespondWithJson(w, http.StatusOK, associations)
}

func SingleSeriesEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email    string
		err      error
		dao      daos.DaoInterface
		ok       bool
		seriesID string
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	if seriesID, err = url.PathUnescape(mux.Vars(r)["series"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing series id")
		return
	}
	if seriesID == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing series id")
		return
	}
	series, err := dao.GetSeriesByID(email, seriesID)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondWithJson(w, http.StatusOK, series)
}

func AllSeriesEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email string
		err   error
		dao   daos.DaoInterface
		ok    bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	userDetails, err := dao.GetUserDetails(email)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	series, err := dao.GetAllSeriesWithStories(email, userDetails.Admin)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondWithJson(w, http.StatusOK, series)
}

func AllSeriesVolumesEndPoint(w http.ResponseWriter, r *http.Request) {
	var (
		email       string
		seriesTitle string
		err         error
		dao         daos.DaoInterface
		ok          bool
	)
	if email, err = getUserEmail(r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if seriesTitle, err = url.PathUnescape(mux.Vars(r)["series"]); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error parsing series name")
		return
	}
	if seriesTitle == "" {
		RespondWithError(w, http.StatusBadRequest, "Missing series name")
		return
	}
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}
	volumes, err := dao.GetSeriesVolumes(email, seriesTitle)
	if err != nil {
		if opErr, ok := err.(*smithy.OperationError); ok {
			awsResponse := processAWSError(opErr)
			if awsResponse.Code == 0 {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
				return
			}
			RespondWithError(w, awsResponse.Code, awsResponse.Message)
			return
		}
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var readyStories []*models.Story
	for _, story := range volumes {
		allTablesReady := true
		for _, chapter := range story.Chapters {
			status, err := dao.CheckTableStatus(story.ID + "_" + chapter.ID + "_blocks")
			if err != nil {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
			}
			if status != "ACTIVE" {
				// only return stories with all its tables in active status
				allTablesReady = false
			}
		}
		if allTablesReady {
			readyStories = append(readyStories, story)
		}
	}
	RespondWithJson(w, http.StatusOK, readyStories)
}

func GetUserData(w http.ResponseWriter, r *http.Request) {
	session, err := sessions.Get(r, "token")
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var user models.UserInfo
	if err = json.Unmarshal(session.Values["token_data"].([]byte), &user); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	var wasSuspended, ok bool
	if wasSuspended, ok = r.Context().Value(ctxkey.IsSuspended).(bool); !ok {
		wasSuspended = false
	}
	user.Expired = wasSuspended
	var dao daos.DaoInterface
	if dao, ok = r.Context().Value(ctxkey.DAO).(daos.DaoInterface); !ok {
		RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve daokey from context")
		return
	}
	details, err := dao.GetUserDetails(user.Email)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	user.Admin = details.Admin
	user.Renewing = details.Renewing
	user.SubscriptionID = details.SubscriptionID
	RespondWithJson(w, http.StatusOK, user)
}
