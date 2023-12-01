import { Moment } from "moment";
import { App, Editor, EditorRange, EditorPosition, normalizePath, TFile } from "obsidian";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";

import { DayOfWeek } from "./settings";

const daysOfWeek: Omit<DayOfWeek, "locale-default">[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function getWordBoundaries(editor: Editor): EditorRange {
  const cursor = editor.getCursor();

    const pos = editor.posToOffset(cursor);
    const word = (editor as any).cm.state.wordAt(pos);
    const wordStart = editor.offsetToPos(word.from);
    const wordEnd = editor.offsetToPos(word.to);
    return {
      from: wordStart,
      to: wordEnd,
    };
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

export function getWeekNumber(dayOfWeek: Omit<DayOfWeek, "locale-default">): number {
  return daysOfWeek.indexOf(dayOfWeek);
}

export function getLocaleWeekStart(): Omit<DayOfWeek, "locale-default"> {
  // @ts-ignore
  const startOfWeek = window.moment.localeData()._week.dow;
  return daysOfWeek[startOfWeek];
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

export async function getOrCreateDailyNote(date: Moment): Promise<TFile | null> {
  // Borrowed from the Slated plugin:
  // https://github.com/tgrosinger/slated-obsidian/blob/main/src/vault.ts#L17
  const desiredNote = getDailyNote(date, getAllDailyNotes());
  if (desiredNote) {
    return Promise.resolve(desiredNote);
  }
  return createDailyNote(date);
}

// Source `chrono`:
// https://github.com/wanasit/chrono/blob/47f11da6b656cd5cb61f246e8cca706983208ded/src/utils/pattern.ts#L8
// Copyright (c) 2014, Wanasit Tanakitrungruang
type DictionaryLike = string[] | { [word: string]: unknown } | Map<string, unknown>;

function extractTerms(dictionary: DictionaryLike): string[] {
  let keys: string[];
  if (dictionary instanceof Array) {
    keys = [...dictionary];
  } else if (dictionary instanceof Map) {
    keys = Array.from((dictionary as Map<string, unknown>).keys());
  } else {
    keys = Object.keys(dictionary);
  }

  return keys;
}
function matchAnyPattern(dictionary: DictionaryLike): string {
  const joinedTerms = extractTerms(dictionary)
    .sort((a, b) => b.length - a.length)
    .join("|")
    .replace(/\./g, "\\.");

  return `(?:${joinedTerms})`;
}

const ORDINAL_WORD_DICTIONARY: { [word: string]: number } = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  "twenty first": 21,
  "twenty-first": 21,
  "twenty second": 22,
  "twenty-second": 22,
  "twenty third": 23,
  "twenty-third": 23,
  "twenty fourth": 24,
  "twenty-fourth": 24,
  "twenty fifth": 25,
  "twenty-fifth": 25,
  "twenty sixth": 26,
  "twenty-sixth": 26,
  "twenty seventh": 27,
  "twenty-seventh": 27,
  "twenty eighth": 28,
  "twenty-eighth": 28,
  "twenty ninth": 29,
  "twenty-ninth": 29,
  thirtieth: 30,
  "thirty first": 31,
  "thirty-first": 31,
};

export const ORDINAL_NUMBER_PATTERN = `(?:${matchAnyPattern(
  ORDINAL_WORD_DICTIONARY
)}|[0-9]{1,2}(?:st|nd|rd|th)?)`;

export function parseOrdinalNumberPattern(match: string): number {
  let num = match.toLowerCase();
  if (ORDINAL_WORD_DICTIONARY[num] !== undefined) {
    return ORDINAL_WORD_DICTIONARY[num];
  }

  num = num.replace(/(?:st|nd|rd|th)$/i, "");
  return parseInt(num);
}
