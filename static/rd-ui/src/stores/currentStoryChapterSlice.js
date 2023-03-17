import { createSlice } from '@reduxjs/toolkit'

export const currentStoryChapterSlice = createSlice({
  name:'currentStoryChapter',
  initialState: {
    value: 1
  },
  reducers: {
    setCurrentStoryChapter: (state, action) => {
      state.value = action.payload
    }
  }
})

export const { setCurrentStoryChapter } = currentStoryChapterSlice.actions

export default currentStoryChapterSlice.reducer
