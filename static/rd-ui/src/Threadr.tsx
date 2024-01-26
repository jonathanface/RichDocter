import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState } from "react";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";
import "./css/main.css";
import "./css/user-menu.css";
import ConfigPanelModal from "./sections/configPanel/ConfigPanelModal";
import CreateNewStory from "./sections/createNewStory/CreateNewStoryModal";
import DefaultPage from "./sections/defaultPage/DefaultPage";
import Document from "./sections/document/Document";
import EditSeriesModal from "./sections/editSeries/EditSeriesModal";
import EditStory from "./sections/editStory/EditStoryModal";
import LoginPanelModal from "./sections/loginPanel/LoginPanelModal";
import StoryAndSeriesListing from "./sections/storyAndSeriesListing/StoryAndSeriesListing";
import Subscribe from "./sections/subscribe/Subscribe";
import UserMenu from "./sections/userMenu/UserMenu";
import {
  setAlertLink,
  setAlertMessage,
  setAlertOpen,
  setAlertSeverity,
  setAlertTimeout,
  setAlertTitle,
} from "./stores/alertSlice";
import type { AppDispatch, RootState } from "./stores/store";
import { setSelectedStory } from "./stores/storiesSlice";
import { setIsLoaderVisible } from "./stores/uiSlice";
import { flipLoggedInState, setUserDetails } from "./stores/userSlice";
import Toaster from "./utils/Toaster";

const Threadr = () => {
  const [isLoading, setIsLoading] = useState(true);
  const stripeKey: string = process.env.REACT_APP_STRIPE_KEY ?? "";
  const [stripe, setStripe] = useState(() => loadStripe(stripeKey));

  const useAppDispatch: () => AppDispatch = useDispatch;
  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const selectedStory = useAppSelector((state) => state.stories.selectedStory);

  const getStoryDetails = async (storyID: string) => {
    const url = "/api/stories/" + storyID;
    try {
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
    }
  };

  const handleNavChange = async () => {
    const location = window.location.pathname;
    const splitDirectories = location.split("/");
    if (splitDirectories[1] === "story" && splitDirectories[2].trim() !== "") {
      const story = await getStoryDetails(splitDirectories[2].trim());
      dispatch(setSelectedStory(story));
    } else {
      dispatch(setSelectedStory(null));
    }
  };

  useEffect(() => {
    dispatch(setIsLoaderVisible(true));
    window.addEventListener("popstate", () => {
      handleNavChange();
    });

    fetch("/api/user", {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Fetch problem userData " + response.status);
      })
      .then((json) => {
        dispatch(setUserDetails(json));
        setIsLoading(false);
        dispatch(flipLoggedInState());
        if (json.expired) {
          dispatch(setAlertTitle("Subscription expired"));
          dispatch(
            setAlertMessage(
              "Your subscription expired, and you didn't have auto-renewal enabled. Any additional stories you had created have been removed from your account, but may be recovered by re-subscribing."
            )
          );
          dispatch(setAlertLink({ location: "subscribe" }));
          dispatch(setAlertSeverity("error"));
          dispatch(setAlertTimeout(null));
          dispatch(setAlertOpen(true));
        } else {
          dispatch(setAlertTitle("Welcome to the RichDocter prerelease!"));
          dispatch(setAlertSeverity("info"));
          dispatch(setAlertTimeout(20000));
          dispatch(
            setAlertMessage(
              "As this application is still under development, making regular offline backup of your work is highly recommended.\nPlease send any bugs, feedback, or glowing praise to:"
            )
          );
          dispatch(setAlertLink({ location: "contact" }));
          dispatch(setAlertOpen(true));
        }
      })
      .catch((e) => {
        setIsLoading(false);
        dispatch(setIsLoaderVisible(false));
        console.error("ERROR", e);
      });
    handleNavChange();
    return () => window.removeEventListener("popstate", handleNavChange);
  }, [dispatch]);

  const displayComponent = !isLoading ? (
    isLoggedIn && selectedStory ? (
      <Document story={selectedStory} />
    ) : isLoggedIn && !selectedStory ? (
      <StoryAndSeriesListing />
    ) : (
      <DefaultPage />
    )
  ) : (
    <div />
  );

  return (
    <div className="App">
      <main>
        <header>
          <UserMenu isParentLoading={isLoading} />
          <h4>
            <span>R</span>ich<span>D</span>octer
            <img src="/img/logo_trans_scaled.png" alt="RichDocter" />
            <div className="version">beta</div>
          </h4>
        </header>
        {displayComponent}
        <CreateNewStory />
        <EditStory />
        <EditSeriesModal />
        <ConfigPanelModal />
        <LoginPanelModal />
      </main>
      <Toaster />
      <Elements stripe={stripe}>
        <Subscribe />
      </Elements>
    </div>
  );
};

export default Threadr;