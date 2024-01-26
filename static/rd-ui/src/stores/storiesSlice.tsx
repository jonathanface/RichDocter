import { createSlice } from "@reduxjs/toolkit";
import { Story } from "../types";

interface StoriesState {
  isCreatingNew: boolean;
  isEditingStory: boolean;
  belongsToSeries: string;
  standaloneList: string[];
  editables: Object;
  selectedStory: Story | null;
}

const initialState: StoriesState = {
  isCreatingNew: false,
  isEditingStory: false,
  belongsToSeries: "",
  standaloneList: [],
  editables: {},
  selectedStory: null,
};

export const storiesSlice = createSlice({
  name: "stories",
  initialState,
  reducers: {
    flipCreatingNewStory: (state, action) => {
      state.belongsToSeries = action.payload;
      if (action.payload) {
        state.isCreatingNew = true;
        return;
      }
      state.isCreatingNew = !state.isCreatingNew;
    },
    flipEditingStory: (state, action) => {
      state.isEditingStory = !state.isEditingStory;
      if (action.payload) {
        state.belongsToSeries = action.payload;
      }
    },
    setStandaloneList: (state, action) => {
      state.standaloneList = action.payload;
    },
    setStoryEditables: (state, action) => {
      state.editables = action.payload;
    },
    setSelectedStory: (state, action) => {
      state.selectedStory = action.payload;
    },
  },
});

export const { flipCreatingNewStory, flipEditingStory, setStandaloneList, setStoryEditables, setSelectedStory } =
  storiesSlice.actions;

export default storiesSlice.reducer;