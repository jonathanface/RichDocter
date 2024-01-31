import AddIcon from "@mui/icons-material/Add";
import { IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { Series, setSeriesList } from "../../stores/seriesSlice";
import { AppDispatch, RootState } from "../../stores/store";
import { flipCreatingNewStory, setStandaloneList } from "../../stores/storiesSlice";
import { setIsLoaderVisible } from "../../stores/uiSlice";
import { Story } from "../../types";
import StoryBox from "../story/Story";
import styles from "./storyAndSeries.module.css";

const StoryAndSeriesListing = () => {
  const useAppDispatch: () => AppDispatch = useDispatch;
  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const userDetails = useAppSelector((state) => state.user.userDetails);
  const storiesList = useAppSelector((state) => state.stories.standaloneList);
  const seriesList = useAppSelector((state) => state.series.seriesList);

  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [storiesLoaded, setStoriesLoaded] = useState(false);

  useEffect(() => {
    dispatch(setIsLoaderVisible(true));
    const getSeries = () => {
      fetch("/api/series", {
        credentials: "include",
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Fetch problem series " + response.status);
        })
        .then((data: any) => {
          const userSeries: Series[] = [];
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              if (key === userDetails.email && data[key]) {
                userSeries.push(...data[key]);
              }
            }
          }
          dispatch(setSeriesList(userSeries));
          setSeriesLoaded(true);
        });
    };

    const getStories = () => {
      fetch("/api/stories", {
        credentials: "include",
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Fetch problem stories " + response.status);
        })
        .then((data) => {
          const userStories: Story[] = [];
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              if (key === userDetails.email && data[key]) {
                userStories.push(...data[key]);
              }
            }
          }
          dispatch(setStandaloneList(userStories));
          setStoriesLoaded(true);
        });
    };
    if (isLoggedIn) {
      if (!seriesLoaded) {
        getSeries();
      } else if (!storiesLoaded) {
        getStories();
      } else {
        dispatch(setIsLoaderVisible(false));
      }
    }
  }, [isLoggedIn, dispatch, seriesLoaded, storiesLoaded]);

  const createNewStory = () => {
    dispatch(flipCreatingNewStory(true));
  };

  // If there are works, we prepare our series and stories components.
  const seriesComponents = seriesList.map((series) => {
    return (
      <StoryBox
        key={series.series_id}
        id={series.series_id}
        title={series.series_title}
        description={series.series_description}
        stories={series.stories}
        image_url={series.image_url}
      />
    );
  });

  const storyComponents = storiesList.map((story) => {
    return (
      <StoryBox
        key={story.story_id}
        id={story.story_id}
        chapters={story.chapters}
        title={story.title}
        description={story.description}
        image_url={story.image_url}
      />
    );
  });

  let content = <div />;
  if (seriesLoaded && storiesLoaded && (seriesList.length || storiesList.length)) {
    content = (
      <React.Fragment>
        {seriesComponents}
        {storyComponents}
      </React.Fragment>
    );
  } else if (seriesLoaded && storiesLoaded) {
    content = (
      <h3>
        You haven't created any stories yet.
        <br />← Click the ridiculously oversized plus button over there to get started.
      </h3>
    );
  }

  return (
    <div className={styles.listingPage}>
      <div className={styles.btnContainer}></div>
      {isLoggedIn ? (
        <div>
          <h2>Stories</h2>
          <div className={styles.iconBox}>
            <span className={styles.createStoryButton}>
              <IconButton
                aria-label="add new story"
                sx={{ margin: "0 auto" }}
                component="label"
                onClick={createNewStory}
                title="Create Story">
                <AddIcon
                  sx={{
                    color: "#F0F0F0",
                    fontSize: 100,
                    "&:hover": {
                      fontWeight: "bold",
                      color: "#2a57e3",
                    },
                  }}
                />
              </IconButton>
            </span>
            {content}
          </div>
        </div>
      ) : (
        ""
      )}
      <div className={styles.logoContainer}>
        <img alt="RichDocter logo" title="RichDocter - Organized Imagination" src="img/logo_trans_scaled.png" />
      </div>
    </div>
  );
};

export default StoryAndSeriesListing;
