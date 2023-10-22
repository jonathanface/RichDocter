import AddIcon from '@mui/icons-material/Add';
import { IconButton } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import '../../css/landing-page.css';
import { flipCreatingNewStoryState } from '../../stores/creatingNewStorySlice';
import { setLoaderVisible } from '../../stores/displayLoaderSlice';
import Story from '../story/Story';

const StoryAndSeriesListing = () => {
  const isLoggedIn = useSelector((state) => state.isLoggedIn.value);
  const [stories, setStories] = useState([]);
  const [seriesGroup, setSeriesGroups] = useState([]);
  const dispatch = useDispatch();
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [storiesLoaded, setStoriesLoaded] = useState(false);

  useEffect(() => {
    dispatch(setLoaderVisible(true));
    const getSeries = () => {
      fetch('/api/series').then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Fetch problem series ' + response.status);
      }).then((data) => {
        const seriesStoriesFromDB = new Map();
        data.forEach((series) => {
          seriesStoriesFromDB.set(series.series_title, []);
          if (series.stories) {
            series.stories.forEach((story) => {
              seriesStoriesFromDB.get(series.series_title).push({
                volume: story.title,
                place: story.place,
                created_at: story.created_at
              });
            });
          }
        });
        setSeriesGroups(seriesStoriesFromDB);
        setSeriesLoaded(true);
        setTotalWorks(totalWorks + seriesStoriesFromDB.size);
      });
    };

    const getStories = () => {
      fetch('/api/stories').then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Fetch problem stories ' + response.status);
      }).then((data) => {
        const storiesFromDB = data.map((story) => {
          return {
            title: story.title,
            description: story.description,
            created_at: story.created_at,
            chapter: story.chapters
          };
        });
        setStories(storiesFromDB);
        setStoriesLoaded(true);
      });
    };
    if (isLoggedIn) {
      if (!seriesLoaded) {
        getSeries();
      } else if (!storiesLoaded) {
        getStories();
      } else {
        dispatch(setLoaderVisible(false));
      }
    }
  }, [isLoggedIn, dispatch, seriesLoaded, storiesLoaded]);

  const createNewStory = () => {
    dispatch(flipCreatingNewStoryState());
  };

  
  // If there are works, we prepare our series and stories components.
  const seriesComponents = [...seriesGroup.keys()].map((series) => {
    const entries = seriesGroup.get(series);
    return <Story key={series} series={true} title={series} data={entries} />;
  });

  const storyComponents = stories.map((story) => {
    return <Story key={story.title} series={false} title={story.title} description={story.description} />;
  });

  let content = <div/>;
  if (seriesLoaded && storiesLoaded && (seriesGroup.length || stories.length)) {
    content = (
      <React.Fragment>
        {seriesComponents}
        {storyComponents}
      </React.Fragment>
    );
  } else if (seriesLoaded && storiesLoaded) {
    content = <h3>You haven't created any stories yet.<br/>← Click the ridiculously oversized plus button over there to get started.</h3>
  }
  

  return (
    <div className="landing-page">
      <div className="btn-container"></div>
      {isLoggedIn ?
        <div>
          <h2>Stories</h2>
          <div className="icon-box">
            <span className="create-story-button">
              <IconButton aria-label="add new story" sx={{margin: '0 auto'}} component="label" onClick={createNewStory} title="Create Story">
                <AddIcon sx={{
                  'color': '#F0F0F0',
                  'fontSize': 100,
                  '&:hover': {
                    fontWeight: 'bold',
                    color: '#2a57e3',
                  }
                }}/>
              </IconButton>
            </span>
            {content}
          </div>
        </div>: ''}
    </div>
  );
};

export default StoryAndSeriesListing;
