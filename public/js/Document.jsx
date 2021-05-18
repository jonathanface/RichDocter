import React from 'react';
import Immutable from 'immutable';
import {EditorState, Editor, ContentState, ContentBlock, Modifier, RichUtils, getDefaultKeyBinding, CompositeDecorator, Entity} from 'draft-js';
import {CustomContext} from './CustomContext.jsx';
import {PopPanel} from './PopPanel.jsx';
import {DialogPrompt} from './DialogPrompt.jsx';
import FormatAlignLeftIcon from '@material-ui/icons/FormatAlignLeft';
import FormatAlignRightIcon from '@material-ui/icons/FormatAlignRight';
import FormatAlignCenterIcon from '@material-ui/icons/FormatAlignCenter';
import FormatAlignJustifyIcon from '@material-ui/icons/FormatAlignJustify';
import FormatLineSpacingIcon from '@material-ui/icons/FormatLineSpacing';
import {Globals} from './Globals.jsx';
import PropTypes from 'prop-types';

const addMenu = [
  {label: 'Tag', classes: ['item', 'parent', 'closed'], subitems: [
    {label: 'Character', type: Globals.COMM_TYPE_NEWCHAR, classes: ['item', 'child', 'hidden']},
    {label: 'Place', type: Globals.COMM_TYPE_NEWPLACE, classes: ['item', 'child', 'hidden']},
    {label: 'Event', type: Globals.COMM_TYPE_NEWEVENT, classes: ['item', 'child', 'hidden']}
  ]},
  {label: 'Wikipedia', type: Globals.COMM_TYPE_NEWWIKI, classes: ['item']},
  {label: 'Link', type: Globals.COMM_TYPE_NEWLINK, classes: ['item']}
];

const editMenu = [
  {label: 'Delete', classes: ['item'], type: Globals.COMM_TYPE_DELETEASSOC}
];

const associationNames = new Map();
associationNames.set(Globals.COMM_TYPE_NEWCHAR, 'character');
associationNames.set(Globals.COMM_TYPE_NEWPLACE, 'place');
associationNames.set(Globals.COMM_TYPE_NEWEVENT, 'event');
associationNames.set(Globals.COMM_TYPE_NEWWIKI, 'wiki');
associationNames.set(Globals.COMM_TYPE_NEWLINK, 'link');

const lineSpacings = new Map();
lineSpacings.set('lineheight_single', 1);
lineSpacings.set('lineheight_medium', 1.5);
lineSpacings.set('lineheight_double', 2);

let blockOrder = {};

/**
 * Represents a document containing a work of fiction.
 */
export class Document extends React.Component {
  /**
   * constructor
   *
   * @param {Object} props
  **/
  constructor(props) {
    super(props);

    const dpi = this.getDPI();

    this.state = {
      pageWidth: 8.25 * dpi,
      pageHeight: 11.75 * dpi,
      topMargin: 1 * dpi,
      leftMargin: 1 * dpi,
      rightMargin: 1 * dpi,
      bottomMargin: 1 * dpi,
      currentLineHeight: 'lineheight_double',
      leftOn: true,
      centerOn: false,
      rightOn: false,
      justifyOn: false,
      selectedText: '',
      associations: [],
      loading: true,
      selectedAssociation: '',
      editorState: null,
      dialogTitle: 'Message',
      dialogBody: 'No message set',
      dialogCancelFunc: null,
      dialogOKFunc: null,
      dialogIsPrompt: false,
      dialogOkButtonText: 'Ok',
      dialogCancelButtonText: 'Cancel'
    };
    this.storyID = props.storyID;
    this.rightclickAddMenu = React.createRef();
    this.rightclickEditMenu = React.createRef();
    this.popPanel = React.createRef();
    this.maxWidth = this.state.pageWidth - (this.state.leftMargin + this.state.rightMargin);
    this.currentPage = 0;
    this.SAVE_TIME_INTERVAL = 5000;
    this.socket = null;
    this.deletePressed = false;
    this.pendingEdits = new Map();
    this.pendingPageDeletions = [];
    this.checkSaveInterval = setInterval(() => this.checkForPendingEdits(), this.SAVE_TIME_INTERVAL);
    this.editor = React.createRef();
    this.dialog = React.createRef();
  }

  /**
   * proptypes for lint
   */
  static get propTypes() {
    return {
      storyID: PropTypes.string,
    };
  }

  /**
   * Configure the dialog component and display
   *
   * @param {string} title
   * @param {string} body
   * @param {bool} isPrompt
   * @param {function} okFunc
   * @param {function} cancelFunc
   * @param {string} okButtonText
   * @param {string} cancelButtonText
   */
  setupAndOpenDialog(title='', body='', isPrompt=false, okFunc=null, cancelFunc=null, okButtonText=null, cancelButtonText=null) {
    this.setState({
      dialogTitle: title,
      dialogBody: body,
      dialogIsPrompt: isPrompt,
      dialogOKFunc: okFunc,
      dialogOkButtonText: okButtonText,
      dialogCancelButtonText: cancelButtonText
    }, () => {
      this.dialog.current.setModalOpen(true);
    });
  }

  /**
   * Find entities in block
   *
   * @param {string} type
   * @param {ContentBlock} contentBlock
   * @param {function} callback
   */
  findEntity(type, contentBlock, callback) {
    contentBlock.findEntityRanges((character) => {
      const entityKey = character.getEntity();
      return (entityKey !== null && Entity.get(entityKey).getType() === type);
    }, callback);
  }

  /**
   * Create decorators from an array of text associations and
   * assign their click methods.
   *
   * @return {Object} The composite decorator
   */
  createDecorators() {
    const decorators = [];
    for (let i=0; i < this.state.associations.length; i++) {
      console.log('decor for ', this.state.associations[i].name, ' type ', this.state.associations[i].type);
      switch (this.state.associations[i].type) {
        case Globals.ASSOCIATION_TYPE_CHARACTER:
          decorators.push({
            strategy: this.findCharacter.bind(this),
            component: CharacterSpan,
            props: {
              leftclickFunc: this.clickedCharacter.bind(this),
              rightclickFunc: this.clickedCharacterContext.bind(this)
            }
          });
          break;
        case Globals.ASSOCIATION_TYPE_PLACE:
          decorators.push({
            strategy: this.findPlace.bind(this),
            component: PlaceSpan,
            props: {
              leftclickFunc: this.clickedPlace.bind(this),
              rightclickFunc: this.clickedPlaceContext.bind(this)
            }
          });
          break;
        case Globals.ASSOCIATION_TYPE_EVENT:
          decorators.push({
            strategy: this.findEvent.bind(this),
            component: EventSpan,
            props: {
              leftclickFunc: this.clickedEvent.bind(this),
              rightclickFunc: this.clickedEventContext.bind(this)
            }
          });
          break;
      }
    }
    return new CompositeDecorator(decorators);
  }

  /**
   * Triggered when an association of type 'character' is clicked
   *
   * @param {string} label - the clicked-on text
   */
  clickedCharacter(label) {
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.popPanel.current.updateAndDisplay(assocObj[0].id);
  }

  /**
   * Triggered when clicking on 'new character' from the right-click
   * context menu while document text is highlighted.
   *
   * @param {event} event
   * @param {string} label - the selected text
   */
  clickedCharacterContext(event, label) {
    event.preventDefault();
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.setState({
      selectedAssociation: assocObj[0].id
    }, () => {
      this.rightclickEditMenu.current.updateAndDisplay(event.pageX, event.pageY);
    });
  }

  /**
   * Triggered when an association of type 'place' is clicked
   *
   * @param {string} label - the clicked-on text
   */
  clickedPlace(label) {
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.popPanel.current.updateAndDisplay(assocObj[0].id);
  }

  /**
   * Triggered when clicking on 'new place' from the right-click
   * context menu while document text is highlighted.
   *
   * @param {event} event
   * @param {string} label - the selected text
   */
  clickedPlaceContext(event, label) {
    event.preventDefault();
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.setState({
      selectedAssociation: assocObj[0].id
    }, () => {
      this.rightclickEditMenu.current.updateAndDisplay(event.pageX, event.pageY);
    });
  }

  /**
   * Triggered when an association of type 'event' is clicked
   *
   * @param {string} label - the clicked-on text
   */
  clickedEvent(label) {
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.popPanel.current.updateAndDisplay(assocObj[0].id);
  }

  /**
   * Triggered when clicking on 'new event' from the right-click
   * context menu while document text is highlighted.
   *
   * @param {event} event
   * @param {string} label - the selected text
   */
  clickedEventContext(event, label) {
    event.preventDefault();
    const assocObj = this.state.associations.filter((assoc) => {
      if (this.matchAlias(assoc, label)) {
        return assoc;
      }
      if (!assoc.details.caseSensitive) {
        return assoc.name.toLowerCase() == label.toLowerCase();
      }
      return assoc.name == label;
    });
    this.setState({
      selectedAssociation: assocObj[0].id
    }, () => {
      this.rightclickEditMenu.current.updateAndDisplay(event.pageX, event.pageY);
    });
  }

  /**
   * Check an association object for a matching alias property
   *
   * @param {Object} assoc
   * @param {string} label
   * @return {boolean}
   */
  matchAlias(assoc, label) {
    if (assoc.details.aliases.length) {
      const aliases = assoc.details.aliases.split('|');
      for (let i=0; i < aliases.length; i++) {
        if (!assoc.details.caseSensitive) {
          if (aliases[i].toLowerCase() == label.toLowerCase()) {
            return true;
          }
        }
        if (aliases[i] == label) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Generate the regex match string for associations.
   *
   * @param {string} string
   * @return {string}
   */
  getRegexString(string) {
    return '(' + string + ')+[(?!,.\'-)|(\\s)]+|(sss)+$';
  }

  /**
   * Find entities of type character in block
   *
   * @param {ContentBlock} contentBlock
   * @param {function} callback
   * @param {ContentState} contentState
   */
  findCharacter(contentBlock, callback, contentState ) {
    console.log('fire', callback);
    const text = contentBlock.getText();
    for (let i=0; i < this.state.associations.length; i++) {
      if (!this.state.associations[i].name.trim().length) {
        return;
      }
      if (this.state.associations[i].type == Globals.ASSOCIATION_TYPE_CHARACTER) {
        let match;
        const deets = this.state.associations[i].details;
        const name = this.state.associations[i].name.trim();
        const regexStr = this.getRegexString(name);
        let caseFlag = 'g';
        if (!deets.caseSensitive) {
          caseFlag += 'i';
        }
        const regex = new RegExp(regexStr, caseFlag);
        while ((match = regex.exec(text)) !== null) {
          const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
          callback(start, start + name.length);
        }
        const toArray = deets.aliases.split('|');
        for (let z=0; z < toArray.length; z++) {
          const alias = toArray[z].trim();
          const regexStr = this.getRegexString(alias);
          let caseFlag = 'g';
          if (!deets.caseSensitive) {
            caseFlag += 'i';
          }
          const regex = new RegExp(regexStr, caseFlag);
          while ((match = regex.exec(text)) !== null) {
            const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
            callback(start, start + alias.length);
          }
        }
      }
    }
  }

  /**
   * Find entities of type place in block
   *
   * @param {ContentBlock} contentBlock
   * @param {function} callback
   * @param {ContentState} contentState
   */
  findPlace(contentBlock, callback, contentState ) {
    const text = contentBlock.getText();
    for (let i=0; i < this.state.associations.length; i++) {
      if (!this.state.associations[i].name.trim().length) {
        return;
      }
      if (this.state.associations[i].type == Globals.ASSOCIATION_TYPE_PLACE) {
        let match;
        const deets = this.state.associations[i].details;
        const name = this.state.associations[i].name.trim();
        const regexStr = this.getRegexString(name);
        let caseFlag = 'g';
        if (!deets.caseSensitive) {
          caseFlag = 'gi';
        }
        const regex = new RegExp(regexStr, caseFlag);
        while ((match = regex.exec(text)) !== null) {
          const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
          callback(start, start + name.length);
        }
        const toArray = deets.aliases.split('|');
        for (let z=0; z < toArray.length; z++) {
          const alias = toArray[z].trim();
          const regexStr = this.getRegexString(alias);
          let caseFlag = 'g';
          if (!deets.caseSensitive) {
            caseFlag = 'gi';
          }
          const regex = new RegExp(regexStr, caseFlag);
          while ((match = regex.exec(text)) !== null) {
            const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
            callback(start, start + alias.length);
          }
        }
      }
    }
  }

  /**
   * Find entities of type event in block
   *
   * @param {ContentBlock} contentBlock
   * @param {function} callback
   * @param {ContentState} contentState
   */
  findEvent(contentBlock, callback, contentState ) {
    const text = contentBlock.getText();
    for (let i=0; i < this.state.associations.length; i++) {
      if (!this.state.associations[i].name.trim().length) {
        return;
      }
      if (this.state.associations[i].type == Globals.ASSOCIATION_TYPE_EVENT) {
        let match;
        const deets = this.state.associations[i].details;
        const name = this.state.associations[i].name.trim();
        const regexStr = this.getRegexString(name);
        let caseFlag = 'g';
        if (!deets.caseSensitive) {
          caseFlag = 'gi';
        }
        const regex = new RegExp(regexStr, caseFlag);
        while ((match = regex.exec(text)) !== null) {
          const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
          callback(start, start + name.length);
        }

        const toArray = deets.aliases.split('|');
        for (let z=0; z < toArray.length; z++) {
          const alias = toArray[z].trim();
          const regexStr = this.getRegexString(alias);
          let caseFlag = 'g';
          if (!deets.caseSensitive) {
            caseFlag = 'gi';
          }
          const regex = new RegExp(regexStr, caseFlag);
          while ((match = regex.exec(text)) !== null) {
            const start = match.index + match[0].length - match[0].replace(/^\s+/, '').length;
            callback(start, start + alias.length);
          }
        }
      }
    }
  }

  /** componentDidMount **/
  componentDidMount() {
    this.setState({
      editorState: EditorState.createEmpty()
    });
    this.fetchWebsocketURL();
    window.addEventListener('beforeunload', this.beforeunload.bind(this));
    this.fetchAssociations().then( () => {
      console.log('got assocs', this.state.associations);
      console.log('fetching docs');
      this.fetchDocumentBlocks();
    }, (reason) => {
      console.log('no associations');
      this.fetchDocumentBlocks();
    });
  }

  /** beforeunload **/
  beforeunload() {
    if (this.socket.isOpen) {
      this.socket.close();
    }
  }

  /**
   * Init websocket and assign handlers
   *
   * @param {string} url
   */
  setupWebsocket(url) {
    this.socket = new WebSocket(url);
    this.socket.isOpen = false;

    this.socket.onopen = (event) => {
      this.socket.isOpen = true;
      console.log('opened', this.socket);
    };
    this.socket.onclose = (event) => {
      console.log('socket closed', event);
      this.socket.isOpen = false;
      setTimeout(this.setupWebsocket, 500, url);
    };
    this.socket.onerror = (event) => {
      console.error('socket error', event);
      this.socket.isOpen = false;
      setTimeout(this.setupWebsocket, 5000, url);
    };
    this.socket.onmessage = (event) => {
      console.log('Message from server', JSON.parse(event.data));
      this.processSocketMessage(JSON.parse(event.data));
    };
  }

  /**
   * Force draftJS to redraw its decorators, needed for
   * when the list of associations is updated by the user.
   */
  forceRender() {
    const editorState = this.state.editorState;
    this.setState({editorState: EditorState.set(editorState, {decorator: this.createDecorators()})});
  }

  /**
   * parse and react to received websocket messages
   *
   * @param {JSON} message
   */
  processSocketMessage(message) {
    switch (message.command) {
      case 'pushAssociations':
        console.log('new asses', message.data);
        if (message.data) {
          this.setState({
            associations: message.data
          }, () => {
            // I have to obnoxiously trigger a re-render to get new associations to appear
            this.forceRender();
          });
        }
        break;
      case 'saveFailed':
        break;
      case 'fetchAssociationsFailed':
        this.setupAndOpenDialog('Error', message.data.text);
        break;
      case 'newAssociationFailed':
        this.setupAndOpenDialog('Error', message.data.text);
        break;
      case 'removeAssociationFailed':
        this.setupAndOpenDialog('Error', message.data.text);
        break;
    }
  }

  /**
   * Retrieve all associations from the API.
   *
   * @return {Promise}
   */
  fetchAssociations() {
    return new Promise((resolve, reject) => {
      fetch(Globals.SERVICE_URL + '/story/' + this.storyID + '/associations', {
        headers: Globals.getHeaders()
      }).then((response) => {
        switch (response.status) {
          case 200:
            response.json().then((data) => {
              this.setState({
                associations: data
              }, () => {
                resolve();
              });
            });
            break;
          default:
            reject();
        }
      });
    });
  }

  /**
   * Refresh page associations
   */
  redrawAssociations() {
    this.fetchAssociations();
  }

  /**
   * gets all pages for a given document
   *
   * @return {Promise}
   */
  fetchDocumentBlocks() {
    return fetch(Globals.SERVICE_URL + '/story/' + this.storyID + '/blocks', {
      headers: Globals.getHeaders()
    }).then((response) => {
      switch (response.status) {
        case 200:
          response.json().then((data) => {
            const newBlocks = [];
            data.forEach((item) => {
              newBlocks.push(new ContentBlock({
                key: item.body.key,
                text: item.body.text,
                type: item.body.type,
                data: Immutable.Map(item.body.data)
              }));
            });
            const newContent = ContentState.createFromBlockArray(newBlocks);
            this.setState({
              editorState: EditorState.push(this.state.editorState, newContent)
            }, () => {
              this.forceRender();
            });
          });
          break;
        case 404: {
          break;
        }
      }
      this.setState({
        loading: false
      });
    }).catch((error) => {
      console.error('Error:', error);
    });
  }

  /**
   * Get the full URL of the websocket from the API
   */
  fetchWebsocketURL() {
    fetch('/wsinit', {
      headers: Globals.getHeaders()
    }).then((response) => response.json()).then((data) => {
      this.setupWebsocket(data.url);
    }).catch((error) => {
      console.error('Error:', error);
    });
  }

  /**
   * Get the current block element being selected
   *
   * @return {Node}
   */
  getSelectedBlockElement() {
    const selection = window.getSelection();
    if (selection.rangeCount == 0) {
      return null;
    }
    let node = selection.getRangeAt(0).startContainer;
    do {
      if (node.getAttribute && node.getAttribute('data-block') == 'true') {
        return node;
      }
      node = node.parentNode;
    } while (node !== null);
    return null;
  }

  /**
   * Remove a block element from the map, which will
   * remove it from the dom as well.
   *
   * @param {EditorState} editorState
   * @param {string} blockKey
   * @return {EditorState}
   */
  removeBlockFromMap(editorState, blockKey) {
    const contentState = editorState.getCurrentContent();
    const blockMap = contentState.getBlockMap();
    if (blockMap.has(blockKey)) {
      const newBlockMap = blockMap.remove(blockKey);
      const newContentState = contentState.merge({
        blockMap: newBlockMap
      });
      return EditorState.push(editorState, newContentState, 'remove-range');
    }
    return editorState;
  }

  /**
   * Check if page's contents exceed maximum height and push it to the subsequent page,
   * creating one if necessary.
   *
   * @param {number} pageNumber
   * @param {boolean} renderedNewPage
   */
  async checkPageHeightAndAdvanceToNextPageIfNeeded(pageNumber, renderedNewPage) {
    const editor = this.editor.current;
    const maxHeight = this.state.pageHeight - this.state.topMargin - this.state.bottomMargin;
    if (editor.editorContainer.firstChild.firstChild.offsetHeight > maxHeight) {
      // later
    }
  }

  /**
   * Get styles of the preceding block
   *
   * @param {EditorState} editorState
   * @return {boolean}
   */
  getPreviousBlockStyles(editorState) {
    const prevSelection = editorState.getCurrentContent().getSelectionBefore();
    const lastBlock = editorState.getCurrentContent().getBlockForKey(prevSelection.getFocusKey());
    const data = lastBlock.getData();
    const styles = {};
    const alignment = data.getIn(['alignment']);
    styles.direction = alignment;
    const lineHeight = data.getIn(['lineHeight']);
    let height = 'lineheight_single';
    if (lineHeight) {
      height = lineHeight;
    }
    styles.lineHeight = height;
    return styles;
  }

  /**
   * insert a TAB entity
   *
   * @param {EditorState} editorState
   * @return {EditorState}
   */
  insertTab(editorState) {
    const currentContent = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const contentStateWithEntity = currentContent.createEntity('TAB', 'IMMUTABLE');
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const textWithEntity = Modifier.insertText(currentContent, selection, '     ', null, entityKey);
    return EditorState.push(editorState, textWithEntity);
  }

  /**
   * Fires on every DraftJS keystroke or cursor change
   *
   * @param {EditorState} newEditorState
   * @param {number} pageNumber
   */
  async onChange(newEditorState) {
    let cursorChange = false;
    const selection = newEditorState.getSelection();
    // Cursor has moved but no text changes detected.
    if (this.state.editorState.getCurrentContent() === newEditorState.getCurrentContent()) {
      cursorChange = true;
      const lastBlock = newEditorState.getCurrentContent().getBlockForKey(selection.getFocusKey());
      if (lastBlock) {
        const lastData = lastBlock.getData();
        this.updateTextControls(lastData.getIn(['alignment']));
        const lineHeight = lastData.getIn(['lineHeight']);
        this.updateTextControls(lineHeight);
      }
    }

    const dataMap = [];
    const blockTree = newEditorState.getBlockTree(selection.getFocusKey());
    if (!blockTree) {
      // a new block has been added, copy styles from previous block
      const styles = this.getPreviousBlockStyles(newEditorState);
      dataMap.push(['alignment', styles.direction]);
      dataMap.push(['lineHeight', styles.lineHeight]);
      const iMap = Immutable.Map(dataMap);
      const nextContentState = Modifier.mergeBlockData(newEditorState.getCurrentContent(), selection, iMap);
      newEditorState = EditorState.push(newEditorState, nextContentState, 'change-block-data');
      // auto tab if align left
      if (styles.direction == 'left') {
        newEditorState = this.insertTab(newEditorState);
      }
    }
    this.setState({editorState: newEditorState});
    if (!cursorChange) {
      const content = newEditorState.getCurrentContent();
      const block = content.getBlockForKey(selection.getAnchorKey());
      console.log('saving', block.getKey());
      // await this.checkPageHeightAndAdvanceToNextPageIfNeeded(pageNumber);
      this.pendingEdits.set(block.getKey(), true);
    }
  }

  /**
   * Scroll to the currently selected block element
   */
  scrollToBlock() {
    const blockDOM = this.getSelectedBlockElement();
    if (blockDOM) {
      const domY = blockDOM.getBoundingClientRect().top;
      if (Math.abs(domY - window.scrollY) > 400) {
        const scrollToY = blockDOM.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({top: scrollToY-100, behavior: 'smooth'});
      }
    }
  }

  /**
   * Check stored action arrays for upcoming writes
   */
  checkForPendingEdits() {
    this.pendingEdits.forEach((value, key) => {
      if (value) {
        this.saveBlock(key);
        this.pendingEdits.set(key, false);
      }
    });
  }

  /**
   * Send command via websocket save specific page
   *
   * @param {string} key
   */
  saveBlock(key) {
    // Send the encoded page if the socket is open and it hasn't been subsequently deleted
    if (this.socket.isOpen) {
      const block = this.state.editorState.getCurrentContent().getBlockForKey(key);
      console.log('save block', block);
      if (block) {
        this.socket.send(JSON.stringify({command: 'saveBlock', data: {key: block.getKey(), storyID: this.storyID, body: block.toJSON()}}));
        this.saveBlockOrder();
      }
    }
  }

  /**
   * Save the ordered state of the block map to mongo
   */
  saveBlockOrder() {
    const order = this.state.editorState.getCurrentContent().getBlockMap()._map._root.entries;
    const toObj = {};
    for (let i=0; i < order.length; i++) {
      toObj[order[i][0]] = order[i][1];
    }
    console.log(blockOrder, toObj);
    if (blockOrder != JSON.stringify(toObj)) {
      blockOrder = JSON.stringify(toObj);
      this.socket.send(JSON.stringify({command: 'updateBlockOrder', data: {storyID: this.storyID, order: toObj}}));
    }
  }

  /**
   * Send command via websocket to delete given page
   *
   * @param {number} key
   */
  deleteBlock(key) {
    console.log('deleting block', key);
    if (this.socket.isOpen) {
      this.socket.send(JSON.stringify({command: 'deleteBlock', data: {key: key, storyID: this.storyID}}));
    }
  }

  /**
   * Get user's resolution based on device DPI
   *
   * @return {number} resolution
   */
  getDPI() {
    let i=56;
    for (i = 56; i < 2000; i++) {
      if (matchMedia('(max-resolution: ' + i + 'dpi)').matches === true) {
        return i;
      }
    }
    return i;
  }

  /**
   * return a string for specific key presses or combinations
   *
   * @param {event} event
   * @return {string}
   */
  keyBindings(event) {
    // tab pressed
    if (event.keyCode == 9) {
      event.preventDefault();
      this.setState({
        editorState: this.insertTab(this.state.editorState)
      });
    }
    if (event.ctrlKey) {
      if (event.keyCode == 83) {
        return 'ctrl_s';
      }
      if (event.keyCode == 190) {
        return 'ctrl_>';
      }
      if (event.keyCode == 188) {
        return 'ctrl_<';
      }
    }
    return getDefaultKeyBinding(event);
  }

  /**
   * Calls for specific keypresses
   *
   * @param {string} command
   * @param {number} pageNumber
   */
  handleKeyCommand(command, pageNumber) {
    console.log('cmd', command, 'page', pageNumber);
    switch (command.toLowerCase()) {
      case 'delete':
      case 'backspace': {
        console.log('hit delete');
        this.deletePressed = true;
        this.onChange(this.state.editorState);
        break;
      }
      case 'bold':
      case 'italic':
      case 'underline': {
        this.setState({
          editorState: RichUtils.toggleInlineStyle(this.state.editorState, command.toUpperCase())
        });
        break;
      }
    }
  }

  /**
   * Set focus to passed Draft element
   * @param {number} index
   */
  setFocus(index) {
    // console.log('focus on', index);
    this.currentPage = index;
    this.editor.current.focus();
    if (this.rightclickAddMenu.current.IsOpen) {
      this.rightclickAddMenu.current.hide();
    }
    if (this.rightclickEditMenu.current.IsOpen) {
      this.rightclickEditMenu.current.hide();
    }
    if (this.popPanel.current.IsOpen) {
      this.popPanel.current.hide();
    }
  }

  /**
   * Toggle states of text controls based on current block style
   * @param {string} style
   */
  updateTextControls(style) {
    if (lineSpacings.has(style)) {
      this.setState({
        currentLineHeight: style
      });
      return;
    }

    let l=true;
    let c=false;
    let r=false;
    let j=false;
    switch (style) {
      case 'center':
        l = false;
        c = true;
        r = false;
        j = false;
        break;
      case 'right':
        l = false;
        c = false;
        j = false;
        r = true;
        break;
      case 'justify':
        l = false;
        r = false;
        c = false;
        j = true;
        break;
    }
    this.setState({
      leftOn: l,
      centerOn: c,
      rightOn: r,
      justifyOn: j
    });
  }

  /**
   * get block css styles from block metadata
   *
   * @param {Block} contentBlock
   * @return {string} classStr
   */
  generateBlockStyle(contentBlock) {
    let classStr = '';
    const data = contentBlock.getData();
    const alignment = data.getIn(['alignment']);
    if (alignment) {
      classStr += 'align_' + data.getIn(['alignment']);
    }
    const lineHeight = data.getIn(['lineHeight']);
    if (lineHeight) {
      if (classStr.length) {
        classStr += ' ';
      }
      classStr += lineHeight;
    }
    return classStr;
  }

  /**
   * Update the current block's alignment based on button click
   *
   * @param {string} style
   * @param {event} event
   */
  updateTextAlignment(style, event) {
    event.preventDefault();
    const selection = this.state.editorState.getSelection();
    const nextContentState = Modifier.mergeBlockData(this.state.editorState.getCurrentContent(), selection, Immutable.Map([['alignment', style]]));
    this.updateTextControls(style);
    this.setState({
      editorState: EditorState.push(this.state.editorState, nextContentState, 'change-block-data')
    }, () => {
      const content = this.state.editorState.getCurrentContent();
      const block = content.getBlockForKey(selection.getAnchorKey());
      this.pendingEdits.set(block.getKey(), true);
    });
  }

  /**
   * Update the current block's line-height based on button click
   *
   * @param {event} event
   */
  updateLineHeight(event) {
    event.preventDefault();
    const clicked = event.target.dataset.height;
    let nextSpacing = 'lineheight_single';
    let prevMatch = false;
    let key;
    for ([key] of lineSpacings) {
      if (key == clicked) {
        prevMatch = true;
        continue;
      }
      if (prevMatch) {
        nextSpacing = key;
        break;
      }
    }
    const selection = this.state.editorState.getSelection();
    this.state.editorState = EditorState.forceSelection(this.state.editorState, selection);
    const nextContentState = Modifier.mergeBlockData(this.state.editorState.getCurrentContent(), selection, Immutable.Map([['lineHeight', nextSpacing]]));
    this.setState({
      editorState: EditorState.push(this.state.editorState, nextContentState, 'change-block-data'),
      currentLineHeight: nextSpacing
    }, () => {
      const content = this.state.editorState.getCurrentContent();
      const block = content.getBlockForKey(selection.getAnchorKey());
      this.pendingEdits.set(block.getKey(), true);
    });
  }

  /**
   * Handler for right-click event
   *
   * @param {Event} event
  **/
  onRightClick(event) {
    const text = this.getSelectedText(this.state.editorState);
    if (text.length) {
      event.preventDefault();
      this.setState({selectedText: text});
      this.rightclickAddMenu.current.updateAndDisplay(event.pageX, event.pageY);
    }
  }

  /**
   * Get the current selected (highlighted) text
   *
   * @param {Object} editorState
   * @return {String} selectedText
  **/
  getSelectedText(editorState) {
    const selection = editorState.getSelection();
    const anchorKey = selection.getAnchorKey();
    const currentContent = editorState.getCurrentContent();
    const currentBlock = currentContent.getBlockForKey(anchorKey);

    const start = selection.getStartOffset();
    const end = selection.getEndOffset();
    const selectedText = currentBlock.getText().slice(start, end);
    return selectedText;
  }

  /**
   * render
   * @return {element}
  **/
  render() {
    if (this.state.loading) {
      return (<div>loading...</div>);
    } else {
      return (
        <div style={{'position': 'relative'}}>
          <nav className="docControls">
            <ul style={{width: this.state.pageWidth}}>
              <li><FormatAlignLeftIcon fontSize="inherit" className={this.state.leftOn ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={(e) => this.updateTextAlignment('left', e)}/></li>
              <li><FormatAlignCenterIcon fontSize="inherit" className={this.state.centerOn ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={(e) => this.updateTextAlignment('center', e)}/></li>
              <li><FormatAlignRightIcon fontSize="inherit" className={this.state.rightOn ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={(e) => this.updateTextAlignment('right', e)}/></li>
              <li><FormatAlignJustifyIcon fontSize="inherit" className={this.state.justifyOn ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={(e) => this.updateTextAlignment('justify', e)} /></li>
              <li style={{'paddingTop': '2px'}}>
                <span>
                  <FormatLineSpacingIcon data-height={this.state.currentLineHeight} fontSize="inherit" onMouseDown={(e) => e.preventDefault()} onClick={(e) => this.updateLineHeight(e)}/>
                  <span>{lineSpacings.get(this.state.currentLineHeight)}</span>
                </span>
              </li>
            </ul>
          </nav>
          <div className="editorRoot" style={{width: this.state.pageWidth}}>
            <div onClick={this.focus} className="editorContainer">
              <section onContextMenu={(e)=> {this.onRightClick(e);}} onClick={() => {this.setFocus();}} className="margins" style={{maxHeight: this.state.pageHeight, height: this.state.pageHeight, paddingLeft: this.state.leftMargin, paddingRight: this.state.rightMargin, paddingTop: this.state.topMargin, paddingBottom: this.state.bottomMargin}}>
                <Editor
                  editorState={this.state.editorState}
                  handleKeyCommand={(command) => {
                    this.handleKeyCommand(command);
                  }}
                  keyBindingFn={this.keyBindings.bind(this)}
                  placeholder="Write something..."
                  blockStyleFn={this.generateBlockStyle.bind(this)}
                  onChange={this.onChange.bind(this)}
                  ref={this.editor}/>
              </section>
            </div>
          </div>
          <CustomContext ref={this.rightclickAddMenu} type="add" items={JSON.stringify(addMenu)} selected={this.state.selectedText} socket={this.socket} storyID={this.storyID}/>
          <CustomContext ref={this.rightclickEditMenu} type="edit" items={JSON.stringify(editMenu)} editingID={this.state.selectedAssociation} socket={this.socket} storyID={this.storyID}/>
          <PopPanel ref={this.popPanel} label="" storyID={this.storyID} onUpdateAssociationComplete={this.redrawAssociations.bind(this)}/>
          <DialogPrompt ref={this.dialog} title={this.state.dialogTitle} body={this.state.dialogBody} isPrompt={this.state.dialogIsPrompt} okFunc={this.state.dialogOKFunc} cancelFunc={this.state.dialogCancelFunc} okButtonText={this.state.dialogOkButtonText} cancelButtonText={this.state.dialogCancelButtonText}/>
        </div>
      );
    }
  }
}

const CharacterSpan = (props) => {
  return (
    <span onClick={(e)=> {props.leftclickFunc(props.decoratedText);}} onContextMenu={(e)=> {props.rightclickFunc(e, props.decoratedText);}} className="highlight character">
      {props.children}
    </span>
  );
};

const PlaceSpan = (props) => {
  return (
    <span onClick={(e)=> {props.leftclickFunc(props.decoratedText);}} onContextMenu={(e)=> {props.rightclickFunc(e, props.decoratedText);}} className="highlight place">
      {props.children}
    </span>
  );
};

const EventSpan = (props) => {
  return (
    <span onClick={(e)=> {props.leftclickFunc(props.decoratedText);}} onContextMenu={(e)=> {props.rightclickFunc(e, props.decoratedText);}} className="highlight event">
      {props.children}
    </span>
  );
};

CharacterSpan.propTypes = PlaceSpan.propTypes = EventSpan.propTypes = {
  leftclickFunc: PropTypes.func,
  rightclickFunc: PropTypes.func,
  decoratedText: PropTypes.string,
  children: PropTypes.array
};
