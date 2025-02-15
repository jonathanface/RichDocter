package sessions

import (
	"RichDocter/models"
	"log"
	"net/http"
	"os"
	"strings"

	gsessions "github.com/gorilla/sessions"
	"github.com/joho/godotenv"
)

func init() {
	currentMode := models.AppMode(strings.ToLower(os.Getenv("MODE")))
	if currentMode != models.ModeProduction && currentMode != models.ModeStaging {
		if err := godotenv.Load(); err != nil {
			log.Println("Error loading .env file for session store")
		}
	}
}

var store = gsessions.NewCookieStore([]byte(os.Getenv("SESSION_SECRET")))

func Get(req *http.Request, key string) (*gsessions.Session, error) {
	cookie, err := store.Get(req, key)
	//cookie.Options.SameSite = http.SameSiteLaxMode
	return cookie, err
}
