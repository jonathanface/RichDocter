import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './css/main.css';
import './css/user-menu.css';
import DefaultPage from './sections/DefaultPage/DefaultPage';
import UserMenu from './sections/UserMenu/UserMenu';
import CreateNewStory from './sections/createNewStory/CreateNewStoryModal';
import Document from './sections/document/Document';
import StoryAndSeriesListing from './sections/storyAndSeriesListing/StoryAndSeriesListing';
import Subscribe from './sections/subscribe/Subscribe';
import { setLoaderVisible } from './stores/displayLoaderSlice';
import { flipLoggedInState } from './stores/loggedInSlice';
import { setSelectedSeries } from './stores/selectedSeriesSlice';
import { setSelectedStoryTitle } from './stores/selectedStorySlice';
import Toaster from './utils/Toaster';

const Threadr = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stripe, setStripe] = useState(() => loadStripe(process.env.REACT_APP_STRIPE_KEY))
  const isLoggedIn = useSelector((state) => state.isLoggedIn.value);
  const selectedStoryTitle = useSelector((state) => state.selectedStoryTitle.value);
  const dispatch = useDispatch(); 
 
  const handleNavChange = () => {
    const location = window.location.pathname;
    const splitDirectories = location.split('/');
    if (splitDirectories[1] === 'story' && splitDirectories[2].trim() !== '') {
      dispatch(setSelectedSeries(null));
      dispatch(setSelectedStoryTitle(decodeURIComponent(splitDirectories[2])));
    } else if (splitDirectories[1] === 'series' && splitDirectories[2].trim() !== '') {
      dispatch(setSelectedStoryTitle(null));
      dispatch(setSelectedSeries(decodeURIComponent(splitDirectories[2])));
    } else {
      dispatch(setSelectedStoryTitle(null));
      dispatch(setSelectedSeries(null));
    }
  };

  

  useEffect(() => {
    dispatch(setLoaderVisible(true));
    window.addEventListener('popstate', () => {
      handleNavChange();
    });

    fetch('/api/user').then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Fetch problem userData ' + response.status);
    }).then((data) => {
      setIsLoading(false);
      dispatch(flipLoggedInState());
    }).catch((e) => {
      setIsLoading(false);
      dispatch(setLoaderVisible(false));
      console.error('ERROR', e);
    });
    handleNavChange();
    return () => window.removeEventListener('popstate', handleNavChange);
  }, [dispatch]);
  console.log("isLaoding", isLoading)
  const displayComponent =
    !isLoading
      ? isLoggedIn && selectedStoryTitle
        ? <Document story={selectedStoryTitle} />
        : isLoggedIn && !selectedStoryTitle
          ? <StoryAndSeriesListing />
          : <DefaultPage />
      : <div/>

  return (
    <div className="App">
      <main>
        <header>
            <UserMenu isParentLoading={isLoading}/>
            <h4>
              <span>R</span>ich<span>D</span>octer
              <img src="./img/logo_trans_scaled.png" alt="RichDocter"/>
              <div className="version">beta</div>
            </h4>
        </header>
          {displayComponent}
          <CreateNewStory />
      </main>
      <Toaster/>
      <Elements stripe={stripe}><Subscribe/></Elements>
    </div>
  );
};

export default Threadr;
