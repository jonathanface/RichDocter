import { configureStore } from '@reduxjs/toolkit';
import alertSlice from './alertSlice';
import displayLoaderSlice from './displayLoaderSlice';
import loggedInSlice from './loggedInSlice';
import refreshStoryListSlice from './refreshStoryListSlice';
import selectedSeriesSlice from './selectedSeriesSlice';
import selectedStorySlice from './selectedStorySlice';
import storiesSlice from './storiesSlice';
import subscriptionSlice from './subscriptionSlice';
import menuOpenSlice from './toggleMenuOpenSlice';

export default configureStore({
  reducer: {
    isLoggedIn: loggedInSlice,
    selectedStoryTitle: selectedStorySlice,
    selectedSeries: selectedSeriesSlice,
    stories: storiesSlice,
    refreshStoryList: refreshStoryListSlice,
    isMenuOpen: menuOpenSlice,
    isLoaderVisible: displayLoaderSlice,
    alerts: alertSlice,
    subscription: subscriptionSlice
  },
});
