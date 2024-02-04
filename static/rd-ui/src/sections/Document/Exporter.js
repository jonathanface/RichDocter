import { convertToHTML } from "draft-convert";
import {
  CompositeDecorator,
  ContentBlock,
  Editor,
  EditorState,
  Modifier,
  SelectionState,
  convertFromRaw,
} from "draft-js";
import { FindTabs, TabSpan } from "./decorators";
import { GenerateTabCharacter } from "./utilities";

export default class Exporter {
  constructor(story) {
    this.assembler = new Editor({});
    this.story = story;
  }

  processDBBlock = (content, block) => {
    if (block.getData().STYLES) {
      block.getData().STYLES.forEach((style) => {
        const styleSelection = new SelectionState({
          focusKey: block.key,
          anchorKey: block.key,
          focusOffset: style.end,
          anchorOffset: style.start,
        });
        content = Modifier.applyInlineStyle(content, styleSelection, style.style);
      });
    }
    if (block.getData().ENTITY_TABS) {
      block.getData().ENTITY_TABS.forEach((tab) => {
        const tabSelection = new SelectionState({
          focusKey: block.getKey(),
          anchorKey: block.getKey(),
          anchorOffset: tab.start,
          focusOffset: tab.end,
        });
        const contentStateWithEntity = content.createEntity("TAB", "IMMUTABLE");
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        content = Modifier.replaceText(contentStateWithEntity, tabSelection, GenerateTabCharacter(), null, entityKey);
      });
    }
    return content;
  };

  DocToHTML = async () => {
    try {
      const data = await this.getFullStory(this.story);
      const contentByChapter = [];
      data.chapters_with_contents.forEach((chapter) => {
        const paragraphs = {
          chapterTitle: chapter.chapter.chapter_title,
          blocks: [],
        };
        if (chapter.blocks && chapter.blocks.items) {
          chapter.blocks.items.forEach((piece) => {
            if (piece.chunk) {
              const jsonBlock = JSON.parse(piece.chunk.Value);
              const block = new ContentBlock({
                characterList: jsonBlock.characterList,
                depth: jsonBlock.depth,
                key: piece.key_id.Value,
                text: jsonBlock.text,
                type: jsonBlock.type,
                data: jsonBlock.data,
              });
              paragraphs.blocks.push(block);
            }
          });
        }
        contentByChapter.push(paragraphs);
      });

      const htmlizedContent = [];
      contentByChapter.forEach((chapterContents) => {
        const contentState = {
          entityMap: {},
          blocks: chapterContents.blocks,
        };
        let newContentState = convertFromRaw(contentState);
        chapterContents.blocks.forEach((block) => {
          if (block.getText().length) {
            newContentState = this.processDBBlock(newContentState, block);
          }
        });
        this.assembler.editorState = EditorState.createWithContent(newContentState, this.createDecorators());
        htmlizedContent.push({
          chapter: chapterContents.chapterTitle,
          html: convertToHTML({
            blockToHTML: (block) => {
              const alignment = block.data.ALIGNMENT;
              if (alignment && alignment != "LEFT") {
                let text = block.text;
                const styles = block.inlineStyleRanges;
                if (styles) {
                  let modifier = 0;
                  styles.forEach((style) => {
                    switch (style.style) {
                      case "BOLD":
                        text =
                          text.slice(0, style.offset + modifier) +
                          "<b>" +
                          text.slice(style.offset + modifier, text.length + modifier);
                        text =
                          text.slice(0, style.offset + style.length + 3 + modifier) +
                          "</b>" +
                          text.slice(style.offset + style.length + 3 + modifier, text.length + modifier);
                        modifier += 7;
                        break;
                      case "ITALIC":
                        text =
                          text.slice(0, style.offset + modifier) +
                          "<i>" +
                          text.slice(style.offset + modifier, text.length + modifier);
                        text =
                          text.slice(0, style.offset + style.length + 3 + modifier) +
                          "</i>" +
                          text.slice(style.offset + style.length + 3 + modifier, text.length + modifier);
                        modifier += 7;
                        break;
                      case "UNDERLINE":
                        text =
                          text.slice(0, style.offset + modifier) +
                          "<u>" +
                          text.slice(style.offset + modifier, text.length + modifier);
                        text =
                          text.slice(0, style.offset + style.length + 3 + modifier) +
                          "</u>" +
                          text.slice(style.offset + style.length + 3 + modifier, text.length + modifier);
                        modifier += 7;
                        break;
                      case "STRIKETHROUGH":
                        text =
                          text.slice(0, style.offset + modifier) +
                          "<s>" +
                          text.slice(style.offset + modifier, text.length + modifier);
                        text =
                          text.slice(0, style.offset + style.length + 3 + modifier) +
                          "</s>" +
                          text.slice(style.offset + style.length + 3 + modifier, text.length + modifier);
                        modifier += 7;
                        break;
                    }
                  });
                }
                return "<" + alignment + ">" + text + "</" + alignment + ">";
              }
            },
          })(this.assembler.editorState.getCurrentContent()),
        });
      });
      return htmlizedContent;
    } catch (err) {
      console.error(err);
    }
  };

  createDecorators = () => {
    const decorators = new Array();
    decorators.push({
      strategy: FindTabs,
      component: TabSpan,
    });
    return new CompositeDecorator(decorators);
  };

  getFullStory = (story) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch("/api/stories/" + story + "/full");
        if (!response.ok) {
          reject("SERVER ERROR FETCHING FULL STORY: ", response.body);
        }
        resolve(response.json());
      } catch (e) {
        reject("ERROR FETCHING FULL STORY: ", e);
      }
    });
  };
}