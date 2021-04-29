package API

import (
	"RichDocter/common"
	"context"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"log"
	"net/http"
)

func DeleteStoryEndPoint(w http.ResponseWriter, r *http.Request) {
	sid := mux.Vars(r)[`[0-9a-zA-Z]+`]
	if len(sid) == 0 {
		RespondWithError(w, http.StatusBadRequest, "No story ID received")
		return
	}
	storyID, err := validateBSON(sid)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Missing or invalid storyID")
		return
	}
	client, ctx, err := common.MongoConnect()
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer common.MongoDisconnect(client, ctx)

	claims := r.Context().Value("props").(GoogleClaims)
	log.Println("decoded", claims)

	storiesColl := client.Database("Drafty").Collection("Stories")
	filter := &bson.M{"user": claims.ID, "_id": storyID}
	_, err = storiesColl.DeleteMany(context.Background(), filter)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	pagesColl := client.Database("Drafty").Collection("Pages")
	filter = &bson.M{"storyID": storyID}
	_, err = pagesColl.DeleteOne(context.Background(), filter)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	assocsColl := client.Database("Drafty").Collection("Associations")
	filter = &bson.M{"storyID": storyID}

	find, err := assocsColl.Find(context.Background(), filter)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer find.Close(ctx)

	for find.Next(context.TODO()) {
		var a Association
		err := find.Decode(&a)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		_, err = assocsColl.DeleteMany(context.Background(), filter)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}

		assocDeets := client.Database("Drafty").Collection("AssociationDetails")
		deetsFilter := &bson.M{"_id": a.ID}
		_, err = assocDeets.DeleteOne(context.Background(), deetsFilter)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	RespondWithJson(w, http.StatusOK, "success")
}
