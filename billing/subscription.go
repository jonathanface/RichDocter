package billing

import (
	"RichDocter/api"
	"RichDocter/daos"
	"RichDocter/models"
	"RichDocter/sessions"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	stripe "github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/sub"
	"github.com/stripe/stripe-go/v72/subitem"
)

func SubscribeCustomerEndpoint(w http.ResponseWriter, r *http.Request) {
	stripe.Key = os.Getenv("STRIPE_SECRET")
	if stripe.Key == "" {
		api.RespondWithError(w, http.StatusNoContent, "missing stripe secret")
		return
	}
	token, err := sessions.Get(r, "token")
	if err != nil || token.IsNew {
		api.RespondWithError(w, http.StatusNotFound, "cannot find token")
		return
	}
	var user models.UserInfo
	if err := json.Unmarshal(token.Values["token_data"].([]byte), &user); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	var requestBody map[string]string
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&requestBody); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, "missing or invalid payment id or customer id")
		return
	}
	paymentMethodID := requestBody["payment_method_id"]
	customerID := requestBody["customer_id"]
	priceID := requestBody["price_id"]

	var (
		dao daos.DaoInterface
		ok  bool
	)
	if dao, ok = r.Context().Value("dao").(daos.DaoInterface); !ok {
		api.RespondWithError(w, http.StatusInternalServerError, "unable to parse or retrieve dao from context")
		return
	}

	subscriptionParams := &stripe.SubscriptionParams{
		Customer: &customerID,
		Items: []*stripe.SubscriptionItemsParams{
			{
				Plan: &priceID,
			},
		},
		DefaultPaymentMethod: &paymentMethodID,
	}

	sb, err := sub.New(subscriptionParams)
	if err != nil {
		api.RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	results := models.SubscriptionResults{}
	results.SubscriptionID = sb.ID
	results.PeriodStart = time.Unix(sb.CurrentPeriodStart, 0)
	results.PeriodEnd = time.Unix(sb.CurrentPeriodEnd, 0)
	err = dao.AddSubscriptionID(&user.Email, &sb.ID)
	if err != nil {
		api.RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondWithJson(w, http.StatusOK, results)
}

func cancelSubscription(subscriptionID string) error {
	cancel := true
	subscriptionParams := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: &cancel,
	}

	_, err := sub.Update(subscriptionID, subscriptionParams)
	if err != nil {
		return err
	}

	return nil
}

func UpdateSubscription(subscriptionID, paymentMethodID, priceID string) (*string, error) {
	subItemParams := &stripe.SubscriptionItemListParams{
		Subscription: &subscriptionID,
	}
	i := subitem.List(subItemParams)
	var si *stripe.SubscriptionItem
	for i.Next() {
		si = i.SubscriptionItem()
		break
	}
	if si == nil {
		return nil, fmt.Errorf("no subscription items found for subscription %v", subscriptionID)
	}

	subscriptionParams := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
		ProrationBehavior: stripe.String(string(stripe.SubscriptionProrationBehaviorCreateProrations)),
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    &si.ID,
				Price: &priceID,
			},
		},
		DefaultPaymentMethod: &paymentMethodID,
	}

	stripeSubscription, err := sub.Update(subscriptionID, subscriptionParams)
	if err != nil {
		return nil, err
	}

	return &stripeSubscription.ID, nil
}

func CancelSubscription(subscriptionID string) error {
	cancel := true
	subscriptionParams := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: &cancel,
	}

	_, err := sub.Update(subscriptionID, subscriptionParams)
	if err != nil {
		return err
	}

	return nil
}