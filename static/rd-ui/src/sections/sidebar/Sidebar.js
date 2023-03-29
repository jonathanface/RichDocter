import React, {useState, useEffect} from 'react';
import '../../css/sidebar.css';
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ArticleIcon from '@mui/icons-material/Article';
import EditableTreeItem from './EditableTreeItem';
import TreeItem from '@mui/lab/TreeItem';
import {useSelector, useDispatch} from 'react-redux';
import {flipLoggedInState} from '../../stores/loggedInSlice';
import {setCurrentStoryID} from '../../stores/currentStorySlice';
import {setCurrentStoryChapter} from '../../stores/currentStoryChapterSlice';
import {flipCreatingNewStoryState} from '../../stores/creatingNewStorySlice';
import {flipMenuOpen} from '../../stores/toggleMenuOpenSlice';
import {flipRefreshStoryList} from '../../stores/refreshStoryListSlice';

const groupBySeries = (stories) => {
  const groupedStories = [];
  stories.map((story) => {
    if (story.series !== '') {
      const exists = groupedStories.find((e) => e.key === story.series);
      if (exists) {
        exists.nodes.push({
          key: story.title,
          label: story.title,
          place: story.place,
          created_at: story.created_at,
          chapters: story.chapters
        });
      } else {
        groupedStories.push({
          key: story.series,
          label: story.series,
          series: [{
            key: story.title,
            label: story.title,
            place: story.place,
            created_at: story.created_at,
            chapters: story.chapters
          }]
        });
      }
    } else {
      groupedStories.push({
        key: story.title,
        label: story.title,
        place: story.place,
        created_at: story.created_at,
        chapters: story.chapters
      });
    }
    return groupedStories;
  });
  groupedStories.forEach((story) => {
    if (story.nodes) {
      story.nodes.sort((a, b) => a.place > b.place);
    }
  });
  return groupedStories;
};

const Sidebar = (props) => {
  const [stories, setStories] = useState([]);
  const isLoggedIn = useSelector((state) => state.isLoggedIn.value);
  const refreshStoryList = useSelector((state) => state.refreshStoryList.value);
  const [isCreatingNewChapter, setIsCreatingNewChapter] = useState(false);
  const isOpen = useSelector((state) => state.isMenuOpen.value);
  const [expanded, setExpanded] = useState(["story_label"]);
  // maybe use this for color coding the active doc...?
  // const currentStoryID = useSelector((state) => state.currentStoryID.value);

  const dispatch = useDispatch();

  const getStories = () => {
    fetch('/api/stories')
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Fetch problem stories ' + response.status);
        })
        .then((data) => {
          const sortedStories = groupBySeries(data);
          console.log('stories', sortedStories);
          setStories(sortedStories);
        }).catch((error) => {
          console.error('get stories', error);
        });
  };
  useEffect(() => {
    if (isLoggedIn || refreshStoryList) {
      getStories();
      if (refreshStoryList) {
        dispatch(flipRefreshStoryList());
      }
    }
  }, [isLoggedIn, refreshStoryList, dispatch]);

  const clickStory = (storyID, chapter) => {
    dispatch(setCurrentStoryID(encodeURIComponent(storyID)));
    dispatch(setCurrentStoryChapter(chapter));
    window.history.pushState({storyID}, 'clicked story chapter', '/story/' + encodeURIComponent(storyID) + '?chapter=' + chapter);
  };

  const signin = () => {
    window.location.href = '/auth/google';
  };

  const signout = () => {
    fetch('/logout/google', {
      method: 'DELETE'
    }).then((response) => {
      if (response.ok) {
        dispatch(flipLoggedInState());
        window.history.pushState({}, '', '/');
        return;
      }
      throw new Error('Fetch problem logout ' + response.status);
    }).catch((error) => {
      console.error(error);
    });
  };

  const createNewStory = () => {
    dispatch(flipCreatingNewStoryState());
  };

  const updateLocalStoryChaptersList = (bookTitle, seriesTitle, newChapter) => {
    const storiesWithNewChapter = stories.map(story => {
      if (seriesTitle && story.key === seriesTitle) {
        if (story.series) {
          story.series.forEach(entry => {
            if (entry.key === bookTitle) {
              if (entry.chapters.filter(e => e.chapter_title === newChapter).length > 0) {
                console.error("chapter titles must be unique per book");
                return;
              }
              entry.chapters.push({chapter_title:newChapter, chapter_num: parseInt(entry.chapters.length+1)})
            }
          })
        } else {
          if (story.chapters.filter(e => e.chapter_title === newChapter).length > 0) {
            console.error("chapter titles must be unique per book");
            return;
          }
          story.chapters.push({chapter_title:newChapter, chapter_num: parseInt(story.chapters.length+1)})
        }
      }
      return story;
    });
    setStories(storiesWithNewChapter);
  }
  
  const updateMenuExpandedNodes = (nodeId) => {
    const index = expanded.indexOf(nodeId);
    const copyExpanded = [...expanded];
    if (index === -1) {
      copyExpanded.push(nodeId);
    } else {
      copyExpanded.splice(index, 1);
    }
    setExpanded(copyExpanded);
  }

  const setNewChapterTitle = (event, bookTitle, seriesTitle, chapterNum) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("setnewch", event, bookTitle, seriesTitle, chapterNum);
    const title = event.target.value;
    if (!title.trim().length) {
      console.error("Chapter title cannot be blank");
      return;
    }
    console.log("key", event.keyCode)
    if (event.keyCode === 13) {
      fetch('/api/stories/' + bookTitle + "/chapter", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({chapter_title: title, chapter_num:chapterNum})
      }).then((response) => {
        if (response.ok) {
          updateLocalStoryChaptersList(bookTitle, seriesTitle, title);
          setIsCreatingNewChapter(false);
          setCurrentStoryChapter(title);
          return;
        }
        throw new Error('Fetch problem creating chapter ' + response.status);
      }).catch((error) => {
        console.error(error);
      });
    }
  }

  const flipCreateChapterState = () => {
    setIsCreatingNewChapter(!isCreatingNewChapter);
  }

  const materialStyles = {
    '.MuiTreeItem-group': {
      marginLeft: 0,
      paddingLeft: '10px',
      boxSizing: 'border-box'
    }, '.MuiTreeItem-content': {
      padding:'0px'
    },
    '.MuiTreeItem-label,.MuiTreeItem-iconContainer': {
      marginBottom:'5px',
      marginTop:'5px'
    }
  };

  return (
    <nav className="menu-container">
      <span className="checkbox-container">
        <input className="checkbox-trigger" type="checkbox" onChange={() => {dispatch(flipMenuOpen());}} checked={isOpen} />
        <span className="menu-content">
          <TreeView aria-label="documents navigator" onNodeSelect={(event, nodeId) => {updateMenuExpandedNodes(nodeId)}} defaultCollapseIcon={<ExpandMoreIcon />} defaultExpandIcon={<ChevronRightIcon />} expanded={expanded} defaultExpanded={['story_label']}>
            {isLoggedIn ?
                        <TreeItem sx={materialStyles} key="story_label" nodeId="story_label" label="Stories" className="stories-parent">
                          <TreeItem key="create_label" nodeId="create_label" label="Create" icon={<ArticleIcon/>} onClick={createNewStory} sx={{
                            '& .MuiTreeItem-label': {fontWeight: 'bold'},
                          }}></TreeItem>
                          {
                            stories.map((story) => {
                              return Array.isArray(story.series) ?
                                        <TreeItem key={story.key} label={story.label} nodeId={story.label}>
                                          {story.series.map((seriesEntry) => {
                                            return <TreeItem key={seriesEntry.key} className="chapter-listing" nodeId={seriesEntry.key} label={<div>{seriesEntry.label}</div>}>
                                              {seriesEntry.chapters.map((chapter) => {
                                                return <TreeItem className="chapter-entry" onClick={()=>clickStory(seriesEntry.key, chapter.chapter_num)} key={chapter.chapter_num} label={chapter.chapter_title} nodeId={chapter.chapter_title} />;
                                              })}
                                              <EditableTreeItem isCreating={isCreatingNewChapter} toggleState={flipCreateChapterState} key={seriesEntry.key} nodeId={seriesEntry.key} onChange={(event)=>{
                                                setNewChapterTitle(event, seriesEntry.key, story.key, parseInt(seriesEntry.chapters.length+1));
                                              }} keyVal={seriesEntry.key} defaultVal={"Chapter " + parseInt(seriesEntry.chapters.length+1)}/>
                                            </TreeItem>;
                                          })}
                                        </TreeItem> :
                                        <TreeItem key={story.key} nodeId={story.key} className="chapter-listing" label={story.label}>
                                          {story.chapters.map((chapter) => {
                                            return <TreeItem className="chapter-entry" onClick={()=>clickStory(story.key, chapter.chapter_num)} key={chapter.chapter_num} label={chapter.chapter_title} nodeId={chapter.chapter_title} />;
                                          })}
                                        </TreeItem>;
                            })
                          }
                        </TreeItem> :
                        ''
            }
            {!isLoggedIn ?
                        <TreeItem key="login" nodeId="login" label="Sign In">
                          <TreeItem key="google" nodeId="google" label="Google" icon={<LoginIcon/>} onClick={signin}/>
                        </TreeItem> :
                    <TreeItem key="logout" nodeId="logout" label="Sign Out" icon={<LogoutIcon/>} onClick={signout}/>
            }
          </TreeView>
          <span className="hamburger-menu" />
        </span>
      </span>
    </nav>
  );
};

export default Sidebar;
