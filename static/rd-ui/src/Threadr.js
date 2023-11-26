import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./css/main.css";
import "./css/user-menu.css";
import DefaultPage from "./sections/DefaultPage/DefaultPage";
import UserMenu from "./sections/UserMenu/UserMenu";
import CreateNewStory from "./sections/createNewStory/CreateNewStoryModal";
import Document from "./sections/document/Document";
import EditSeriesModal from "./sections/editSeries/EditSeriesModal";
import EditStory from "./sections/editStory/EditStoryModal";
import StoryAndSeriesListing from "./sections/storyAndSeriesListing/StoryAndSeriesListing";
import Subscribe from "./sections/subscribe/Subscribe";
import { setSelectedStory } from "./stores/storiesSlice";
import { setIsLoaderVisible } from "./stores/uiSlice";
import { flipLoggedInState } from "./stores/userSlice";
import Toaster from "./utils/Toaster";

const Threadr = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stripe, setStripe] = useState(() => loadStripe(process.env.REACT_APP_STRIPE_KEY));
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const selectedStory = useSelector((state) => state.stories.selectedStory);
  const dispatch = useDispatch();

  const getStoryDetails = async (storyID) => {
    const url = "/api/stories/" + storyID;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response);
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
      const newStory = {
        id: story.story_id,
        title: story.title,
      };
      dispatch(setSelectedStory(newStory));
    } else {
      dispatch(setSelectedStory(null));
    }
  };

  useEffect(() => {
    dispatch(setIsLoaderVisible(true));
    window.addEventListener("popstate", () => {
      handleNavChange();
    });

    fetch("/api/user")
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Fetch problem userData " + response.status);
      })
      .then((data) => {
        setIsLoading(false);
        dispatch(flipLoggedInState());
      })
      .catch((e) => {
        setIsLoading(false);
        dispatch(setIsLoaderVisible(false));
        console.error("ERROR", e);
      });
    handleNavChange();
    return () => window.removeEventListener("popstate", handleNavChange);
  }, [dispatch]);
  console.log("logged", isLoggedIn);
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
      </main>
      <Toaster />
      <Elements stripe={stripe}>
        <Subscribe />
      </Elements>
    </div>
  );
};

export default Threadr;
