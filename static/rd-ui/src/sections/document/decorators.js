import React from "react";
import AssociationTooltip from "./AssociationTooltip";

export const TabSpan = (props) => {
  return <span className="tabEntity">{props.children}</span>;
};

export const HighlightSpan = (props) => {
  return (
    <AssociationTooltip
      name={props.association.association_name}
      description={props.association.short_description}
      portrait={props.association.portrait}>
      <span
        onClick={(e) => {
          props.leftClickFunc(props.association, e);
        }}
        onMouseDown={(e) => e.preventDefault()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.rightClickFunc(props.decoratedText, props.association.association_type, e);
        }}
        className={"highlight " + props.association.association_type}>
        {props.children}
      </span>
    </AssociationTooltip>
  );
};

const getRegexString = (string) => {
  return "\\b" + string + "\\b";
};

/**
 * Find entities of type character in block
 *
 * @param {ContentBlock} contentBlock
 * @param {function} callback
 * @param {ContentState} contentState
 */
export const FindHighlightable = (type, name, associations) => {
  return (contentBlock, callback) => {
    const text = contentBlock.getText();
    associations.forEach((association) => {
      if (association.association_type !== type) {
        return;
      }
      if (association.association_name !== name) {
        return;
      }
      let caseFlag = "gm";
      const deets = association.details;
      if (!deets.case_sensitive) {
        caseFlag += "i";
      }

      const allNames = deets.aliases.split(",");
      allNames.push(name);
      allNames.sort((a, b) => {
        return b.length - a.length;
      });

      for (let z = 0; z < allNames.length; z++) {
        const alias = allNames[z].trim();
        if (alias.length) {
          const regexStr = getRegexString(alias);
          const regex = new RegExp(regexStr, caseFlag);
          let match;
          while ((match = regex.exec(text)) !== null) {
            const start = match.index + match[0].length - match[0].replace(/^\s+/, "").length;
            callback(start, start + alias.length);
          }
        }
      }
    });
  };
};

export const FindTabs = (contentBlock, callback, contentState) => {
  contentBlock.findEntityRanges((character) => {
    const entityKey = character.getEntity();
    return entityKey !== null && contentState.getEntity(entityKey).getType() === "TAB";
  }, callback);
};
