import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState } from "react";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";
import "./css/main.css";
import ConfigPanelModal from "./sections/ConfigPanel";
import CreateNewStoryModal from "./sections/CreateNewStoryModal";
import DocumentEditor from "./sections/DocumentEditor";
import EditSeriesModal from "./sections/EditSeriesModal";
import EditStoryModal from "./sections/EditStoryModal";
import LoginPanelModal from "./sections/LoginPanelModal";
import SplashPage from "./sections/SplashPage";
import StoryAndSeriesListing from "./sections/StoryAndSeriesListing";
import Subscribe from "./sections/Subscribe";
import UserMenu from "./sections/UserMenu";
import { setAlert } from "./stores/alertSlice";
import type { AppDispatch, RootState } from "./stores/store";
import { setSelectedStory } from "./stores/storiesSlice";
import { setIsLoaderVisible } from "./stores/uiSlice";
import { flipLoggedInState, setUserDetails } from "./stores/userSlice";
import Toaster, { AlertCommandType, AlertFunctionCall, AlertToast, AlertToastType } from "./utils/Toaster";

const Threadr = () => {
  const [isLoading, setIsLoading] = useState(true);
  const stripeKey: string = process.env.REACT_APP_STRIPE_KEY ?? "";
  const [stripe, setStripe] = useState(() => loadStripe(stripeKey));

  const useAppDispatch: () => AppDispatch = useDispatch;
  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const selectedStory = useAppSelector((state) => state.stories.selectedStory);
  const storyToEdit = useAppSelector((state) => state.stories.storyBeingEdited);
  const seriesToEdit = useAppSelector((state) => state.series.seriesBeingEdited);

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
          const alertFunction: AlertFunctionCall = {
            type: AlertCommandType.subscribe,
            text: "subscribe",
          };
          const newAlert: AlertToast = {
            title: "Subscription expired",
            message:
              "Your subscription expired, and you didn't have auto-renewal enabled. Any additional stories you had created have been removed from your account, but may be recovered by re-subscribing within 30 days.",
            open: true,
            func: alertFunction,
            severity: AlertToastType.warning,
            timeout: undefined,
          };
          dispatch(setAlert(newAlert));
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
      <DocumentEditor />
    ) : isLoggedIn && !selectedStory ? (
      <StoryAndSeriesListing />
    ) : (
      <SplashPage />
    )
  ) : (
    <div />
  );

  return (
    <div className="App">
      <main>
        <header>
          <UserMenu isParentLoading={isLoading} isLoggedIn={isLoggedIn} userDetails={null} />
          <h4>
            <span>D</span>octer<span className="tld">.io</span>
            <div className="version">ver 1.0.1</div>
          </h4>
        </header>
        {displayComponent}
        <CreateNewStoryModal />
        <EditStoryModal story={storyToEdit} />
        <EditSeriesModal series={seriesToEdit} />
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
