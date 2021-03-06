import React from 'react';
import PropTypes from 'prop-types';
import {Globals} from './Globals.jsx';
import {DialogPrompt} from './DialogPrompt.jsx';

/**
 * Right-click menu for tagging document text.
 */
export class CustomContext extends React.Component {
  /**
   * constructor
   *
   * @param {Object} props
  **/
  constructor(props) {
    super(props);

    this.state={
      selected: '',
      items: props.items,
      display: 'none',
      x: 0,
      y: 0,
      modalOpen: false,
      promptTitle: '',
      promptBody: '',
      dialogCancelFunc: null,
      dialogOKFunc: null
    };
    this.type = props.type;
    this.socket = props.socket;
    this.storyID = props.storyID;
    this.IsOpen = false;
    this.divElement = React.createRef();
    this.dialog = React.createRef();
  }

  /**
   * proptypes for lint
  **/
  static get propTypes() {
    return {
      items: PropTypes.string,
      selected: PropTypes.string,
      type: PropTypes.string,
      socket: PropTypes.object,
      storyID: PropTypes.string,
      editingID: PropTypes.string
    };
  }

  /**
   * Create a new text association of a given type.
   *
   * @param {String} text - the text to associate
   * @param {Number} type - the class of association, e.g. character or place
  **/
  createNewAssociation(text, type) {
    console.log('adding new', type, text);
    if (this.socket.isOpen && text.trim().length) {
      this.socket.send(JSON.stringify({command: 'newAssociation', data: {association: {name: text.trim(), type: type, storyID: this.storyID}}}));
    }
  }

  /**
   * Show the modal prompting the user about association deletion
   */
  promptDeleteAssociation() {
    console.log('prompt', this.state.editingID);
    this.setState({
      promptTitle: 'Delete this association?',
      promptBody: 'Are you sure?',
      dialogOKFunc: this.removeAssociation.bind(this)
    }, () => {
      this.dialog.current.setModalOpen(true);
    });
  }

  /**
   * Delete a given text association.
   *
   * @param {String} text - The text to deassociate.
  **/
  removeAssociation() {
    console.log('removing', this.state.editingID);
    if (this.socket.isOpen && this.state.editingID) {
      this.socket.send(JSON.stringify({command: 'removeAssociation', data: {other: {'ID': this.state.editingID, 'storyID': this.storyID}}}));
      this.setState({
        editingID: null
      });
      this.dialog.current.setModalOpen(false);
    }
  }

  /** componentDidMount **/
  componentDidMount() {
  }

  /**
   * Set visibile and update x and y position.
   *
   * @param {Number} xpos
   * @param {Number} ypos
  **/
  updateAndDisplay(xpos, ypos) {
    this.IsOpen = true;
    this.setState({display: 'inline-block', x: xpos, y: ypos});
  }

  /**
   * Hide element
  **/
  hide() {
    this.IsOpen = false;
    this.setState({display: 'none'});
  }

  /**
   * Handler for menu element click
   *
   * @param {Event} event
   * @param {Object} item
  **/
  selectContextItem(event, item) {
    event.stopPropagation();
    event.preventDefault();
    const json = JSON.parse(this.state.items);
    const elementIndex = json.findIndex((element) => element.label == item.label);
    if (elementIndex != -1 && Object.prototype.hasOwnProperty.call(json[elementIndex], 'subitems')) {
      if (json[elementIndex].classes.includes('closed')) {
        json[elementIndex].classes[json[elementIndex].classes.indexOf('closed')] = 'open';
        json[elementIndex].subitems.forEach( (subitem) => {
          subitem.classes[subitem.classes.indexOf('hidden')] = 'visible';
        });
      } else if (json[elementIndex].classes.includes('open')) {
        json[elementIndex].classes[json[elementIndex].classes.indexOf('open')] = 'closed';
        json[elementIndex].subitems.forEach( (subitem) => {
          subitem.classes[subitem.classes.indexOf('visible')] = 'hidden';
        });
      }
      this.setState({
        items: JSON.stringify(json)
      });
    } else if (Object.prototype.hasOwnProperty.call(item, 'type')) {
      if (item.type == Globals.COMM_TYPE_DELETEASSOC) {
        this.promptDeleteAssociation();
      } else {
        this.createNewAssociation(this.state.selected, item.type);
      }
      this.hide();
    } else {
      this.hide();
    }
  }

  /**
   * Props updated from parent
   *
   * @param {Object} props
  **/
  UNSAFE_componentWillReceiveProps(props) {
    this.socket = props.socket;
    let selectedText;
    let editingID;
    props.selected ? selectedText = props.selected : selectedText = '';
    props.editingID ? editingID = props.editingID : editingID = '';
    this.setState({
      selected: selectedText,
      editingID: editingID
    });
  }

  /**
   * Parse passed object into element
   *
   * @param {Object} item
   * @return {element}
  **/
  elementFromObject(item) {
    let hasChildren = false;
    if (Object.prototype.hasOwnProperty.call(item, 'subitems')) {
      hasChildren = true;
    }
    return <div key={item.label}><div className={item.classes.join(' ')} onClick={(e) => this.selectContextItem(e, item)}><span className="title">{item.label}</span>
      {
        hasChildren ? item.subitems.map((subitem) => {
          return this.elementFromObject(subitem);
        }) : ''
      }
    </div></div>;
  }

  /**
   * render
   * @return {element}
  **/
  render() {
    const myStyle = {
      'position': 'absolute',
      'top': this.state.y,
      'left': this.state.x,
      'display': this.state.display
    };
    const json = JSON.parse(this.state.items);
    let header = '';
    if (this.state.selected.length) {
      header = <div className="selected">{this.state.selected}</div>;
    }
    return <div ref={this.divElement} className='custom-context' id='contextMenu' style={myStyle}>
      {header}
      {json.map((item) => {
        return this.elementFromObject(item);
      })}
      <DialogPrompt ref={this.dialog} title={this.state.promptTitle} body={this.state.promptBody} isPrompt={true} okFunc={this.state.dialogOKFunc} cancelFunc={this.state.dialogCancelFunc}/>
    </div>;
  }
}
