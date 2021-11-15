import { App, Editor, EditorRange, EditorPosition, normalizePath } from "obsidian";
import { DayOfWeek } from "./settings";

export default function getWordBoundaries(editor: any): EditorRange {
  const cursor = editor.getCursor();

  let word;

  if (editor.cm instanceof window.CodeMirror) {
    // CM5
    const line = cursor.line;
    word = editor.cm.findWordAt({
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

export function getFormattedDate(date: Date, format: string): string {
  return window.moment(date).format(format);
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function parseTruthy(flag: string): boolean {
  return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
}

export function getLocaleWeekStart(): Omit<DayOfWeek, "locale-default"> {
  // @ts-ignore
  const startOfWeek = window.moment.localeData()._week.dow;
  return window.moment.weekdays()[startOfWeek];
}

export function generateMarkdownLink(app: App, subpath: string, alias?: string) {
  const useMarkdownLinks = (app.vault as any).getConfig("useMarkdownLinks");
  const path = normalizePath(subpath);

  if (useMarkdownLinks) {
    if (alias) {
      return `[${alias}](${path.replace(/ /g, "%20")})`;
    } else {
      return `[${subpath}](${path})`;
    }
  } else {
    if (alias) {
      return `[[${path}|${alias}]]`;
    } else {
      return `[[${path}]]`;
    }
  }
}
