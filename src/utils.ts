import { Moment } from "moment";
import { Editor, EditorRange, EditorPosition } from "obsidian";

export default function getWordBoundaries(editor: any): EditorRange {
  const cursor = editor.getCursor();

  let word;

  if (editor.cm instanceof window.CodeMirror) {
    // CM5
    const line = cursor.line;
    word = editor.findWordAt({
      line: line,
      ch: cursor.ch,
    });
    const wordStart = word.anchor.ch;
    const wordEnd = word.head.ch;

    return {
      from: {
        line: line,
        ch: wordStart,
      },
      to: {
        line: line,
        ch: wordEnd,
      },
    };
  } else {
    // CM6
    const pos = editor.posToOffset(cursor);
    word = editor.cm.state.wordAt(pos);
    const wordStart = editor.offsetToPos(word.from);
    const wordEnd = editor.offsetToPos(word.to);
    return {
      from: wordStart,
      to: wordEnd,
    };
  }
}

export function getSelectedText(editor: Editor): string {
  if (editor.somethingSelected()) {
    return editor.getSelection();
  } else {
    const wordBoundaries = getWordBoundaries(editor);
    editor.setSelection(wordBoundaries.from, wordBoundaries.to); // TODO check if this needs to be updated/improved
    return editor.getSelection();
  }
}

export function adjustCursor(
  editor: Editor,
  cursor: EditorPosition,
  newStr: string,
  oldStr: string
): void {
  const cursorOffset = newStr.length - oldStr.length;
  editor.setCursor({
    line: cursor.line,
    ch: cursor.ch + cursorOffset,
  });
}

export function getMoment(date: Date): Moment {
  return window.moment(date);
}

export function getFormattedDate(date: Date, format: string): string {
  return getMoment(date).format(format);
}
