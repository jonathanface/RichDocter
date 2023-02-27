import {EditorState, Modifier, SelectionState} from 'draft-js';

export const GetSelectedBlocks = (editorState) => {
  const lastSelection = editorState.getSelection();
  const min = lastSelection.getIsBackward() ? lastSelection.getFocusKey() : lastSelection.getAnchorKey();
  const max = lastSelection.getIsBackward() ? lastSelection.getAnchorKey() : lastSelection.getFocusKey();
  const blockMap = editorState.getCurrentContent().getBlockMap();
  const firstSubselection = blockMap.skipUntil((v, k) => k === min);
  const toReverse = firstSubselection.reverse();
  const subselection = toReverse.skipUntil((v, k) => k === max);
  const [...selectedKeys] = subselection.keys();
  return selectedKeys;
}

export const GetStyleData = (block, type, list) => {
  block.findStyleRanges(
      (character) => {
      return character.hasStyle(type);
      },
      (start, end) => {
      list.push({
          start: start,
          end: end,
          style: type
      });
      }
  );
  return list;
}

export const FilterAndReduceDBOperations = (dbOperations, op, i) => {
  const keyIDMap = {};
  let j = i;
  while (j < dbOperations.length) {
    const obj = dbOperations[j];
    if (obj.type === op.type) {
      obj.ops.forEach(op => {
        keyIDMap[op.keyID] = keyIDMap[op.keyID] === undefined ? [] : keyIDMap[op.keyID];
        keyIDMap[op.keyID].push(op);
      });
      dbOperations.splice(j, 1);
    } else {
      j++;
    }
  }
  const toRun = [];
  for (let keyID in keyIDMap) {
    if (keyIDMap.hasOwnProperty(keyID)) {
      toRun.push(keyIDMap[keyID].pop());
      delete keyIDMap[keyID];
    }
  }
  return toRun;
}

export const GetSelectedText = (editorState) => {
  const selection = editorState.getSelection();
  const anchorKey = selection.getAnchorKey();
  const currentContent = editorState.getCurrentContent();
  const currentBlock = currentContent.getBlockForKey(anchorKey);

  const start = selection.getStartOffset();
  const end = selection.getEndOffset();
  const selectedText = currentBlock.getText().slice(start, end);
  return selectedText;
}
  
export const GenerateTabCharacter = (tabLength) => {
  let tab = '';
  for (let i=0; i < tabLength; i++) {
    tab += ' ';
  }
  return tab;
}

export const InsertTab = (editorState, key) => {
  const selection = new SelectionState({
    anchorKey: key,
    focusKey: key,
    anchorOffset: 0,
    focusOffset: 0
  });
  const currentContent = editorState.getCurrentContent();
  const contentStateWithEntity = currentContent.createEntity('TAB', 'IMMUTABLE');
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  const textWithEntity = Modifier.insertText(currentContent, selection, generateTabCharacter(), null, entityKey);
  const newState = EditorState.push(editorState, textWithEntity, 'apply-entity');
  return EditorState.forceSelection(newState, textWithEntity.getSelectionAfter());
}

export const SetFocusAndRestoreCursor = (editorState, ref) => {
  const selection = editorState.getSelection();
    const newSelection = selection.merge({
      anchorOffset: selection.getIsBackward() ? selection.getAnchorOffset() : selection.getFocusOffset(),
      focusOffset: selection.getIsBackward() ? selection.getAnchorOffset() : selection.getFocusOffset()
    })
    ref.current.focus();
    return EditorState.forceSelection(editorState, newSelection);
}
