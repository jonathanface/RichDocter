import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import '../../css/story.css';
import { setLoaderVisible } from '../../stores/displayLoaderSlice';
import { setSelectedSeries } from '../../stores/selectedSeriesSlice';
import { setSelectedStoryTitle } from '../../stores/selectedStorySlice';
import DetailsSlider from './DetailsSlider';


const Story = (props) => {
  const dispatch = useDispatch();
  const [wasDeleted, setWasDeleted] = useState(false);

  const handleClick = (event, title, series) => {
    const history = window.history;
    dispatch(setSelectedStoryTitle(encodeURIComponent(title)));
    if (series) {
      dispatch(setSelectedSeries(encodeURIComponent(series)));
    }
    history.pushState({title}, 'clicked story', '/story/' + encodeURIComponent(title) + '?chapter=1');
    dispatch(setLoaderVisible(true));
  };

  const iconUrl = props.series ? '/img/icons/story_series_icon.jpg' : '/img/icons/story_standalone_icon.jpg';
  const typeLabel = props.series ? "series" : "story";
  return (
        !wasDeleted ?
            <button className="doc-button" onClick={ !props.series ? (e)=>handleClick(e, props.title) : ()=>{}}>
              <div>
                <img src={iconUrl} alt={props.title}/>
                <span className="typeLabel">{typeLabel}</span>
                <DetailsSlider key={props.title} data={props.data} onStoryClick={handleClick} setDeleted={setWasDeleted} series={props.series} title={props.title} description={props.description} />
              </div>
            </button> : ''
  );
};

export default Story;
