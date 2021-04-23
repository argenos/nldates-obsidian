import { Plugin } from "obsidian";

import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";

import DatePickerModal from "./modals/date-picker";
import { NLDResult, getParsedDate } from "./parser";
import { NLDSettingsTab, NLDSettings, DEFAULT_SETTINGS } from "./settings";
import DateSuggest from "./suggest/date-suggest";

export default class NaturalLanguageDates extends Plugin {
  autosuggest: DateSuggest;
  settings: NLDSettings;

  async onload() {
    console.log("Loading natural language date parser plugin");
    await this.loadSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.onTrigger("replace"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-dates-link",
      name: "Parse natural language date (as link)",
      callback: () => this.onTrigger("link"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-date-clean",
      name: "Parse natural language date (as plain text)",
      callback: () => this.onTrigger("clean"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-parse-time",
      name: "Parse natural language time",
      callback: () => this.onTrigger("time"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-now",
      name: "Insert the current date and time",
      callback: () => this.getNowCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-today",
      name: "Insert the current date",
      callback: () => this.getDateCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-time",
      name: "Insert the current time",
      callback: () => this.getTimeCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-picker",
      name: "Date picker",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return !!this.app.workspace.activeLeaf;
        }
        new DatePickerModal(this.app, this).open();
      },
      hotkeys: [],
    });

    this.addSettingTab(new NLDSettingsTab(this.app, this));

    this.registerObsidianProtocolHandler(
      "nldates",
      this.actionHandler.bind(this)
    );

    this.autosuggest = new DateSuggest(this.app, this);
    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      cm.on(
        "change",
        (cmEditor: CodeMirror.Editor, changeObj: CodeMirror.EditorChange) => {
          return this.autosuggest.update(cmEditor, changeObj);
        }
      );
    });
  }

  onunload() {
    console.log("Unloading natural language date parser plugin");
  }

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getSelectedText(editor: any) {
    if (editor.somethingSelected()) {
      return editor.getSelection();
    } else {
      var wordBoundaries = this.getWordBoundaries(editor);
      editor.getDoc().setSelection(wordBoundaries.start, wordBoundaries.end);
      return editor.getSelection();
    }
  }

  getWordBoundaries(editor: any) {
    var cursor = editor.getCursor();
    var line = cursor.line;
    var word = editor.findWordAt({
      line: line,
      ch: cursor.ch,
    });
    var wordStart = word.anchor.ch;
    var wordEnd = word.head.ch;

    return {
      start: {
        line: line,
        ch: wordStart,
      },
      end: {
        line: line,
        ch: wordEnd,
      },
    };
  }

  getMoment(date: Date): any {
    return (window as any).moment(date);
  }

  getFormattedDate(date: Date): string {
    var formattedDate = this.getMoment(date).format(this.settings.format);
    return formattedDate;
  }

  getFormattedTime(date: Date): string {
    var formattedTime = this.getMoment(date).format(this.settings.timeFormat);
    return formattedTime;
  }

  /*
  @param dateString: A string that contains a date in natural language, e.g. today, tomorrow, next week
  @returns NLDResult: An object containing the date, a cloned Moment and the formatted string.

  */
  parseDate(dateString: string): NLDResult {
    let date = getParsedDate(dateString, this.settings.weekStart);
    let formattedDate = this.getFormattedDate(date);
    if (formattedDate === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    let result = {
      formattedString: formattedDate,
      date: date,
      moment: this.getMoment(date),
    };
    return result;
  }

  parseTime(dateString: string): NLDResult {
    let date = getParsedDate(dateString, this.settings.weekStart);
    let formattedTime = this.getFormattedTime(date);
    if (formattedTime === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    let result = {
      formattedString: formattedTime,
      date: date,
      moment: this.getMoment(date),
    };
    return result;
  }

  parseTruthy(flag: string): boolean {
    return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
  }

  onTrigger(mode: string) {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    var cursor = editor.getCursor();
    var selectedText = this.getSelectedText(editor);

    let date = this.parseDate(selectedText);

    if (!date.moment.isValid()) {
      editor.setCursor({
        line: cursor.line,
        ch: cursor.ch,
      });
    } else {
      //mode == "replace"
      var newStr = `[[${date.formattedString}]]`;

      if (mode == "link") {
        newStr = `[${selectedText}](${date.formattedString})`;
      } else if (mode == "clean") {
        newStr = `${date.formattedString}`;
      } else if (mode == "time") {
        let time = this.parseTime(selectedText);

        newStr = `${time.formattedString}`;
      }

      editor.replaceSelection(newStr);
      this.adjustCursor(editor, cursor, newStr, selectedText);
      editor.focus();
    }
  }

  adjustCursor(editor: any, cursor: any, newStr: string, oldStr: string) {
    var cursorOffset = newStr.length - oldStr.length;
    editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + cursorOffset,
    });
  }

  getNowCommand() {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    editor.replaceSelection(
      this.getMoment(new Date()).format(
        `${this.settings.format}${this.settings.separator}${this.settings.timeFormat}`
      )
    );
  }

  getDateCommand() {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    editor.replaceSelection(
      this.getMoment(new Date()).format(this.settings.format)
    );
  }

  getTimeCommand() {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    editor.replaceSelection(
      this.getMoment(new Date()).format(this.settings.timeFormat)
    );
  }

  insertDateString(dateString: string, editor: any, cursor: any) {
    editor.replaceSelection(dateString);
  }

  getDateRange() {}

  async actionHandler(params: any) {
    let date = this.parseDate(params.day);
    let newPane = this.parseTruthy(params.newPane || "yes");

    console.log(date);
    const { workspace } = this.app;

    if (date.moment.isValid()) {
      let dailyNote = await this.getDailyNote(date.moment);

      let leaf = workspace.activeLeaf;
      if (newPane) {
        leaf = workspace.splitActiveLeaf();
      }

      await leaf.openFile(dailyNote);

      workspace.setActiveLeaf(leaf);
    }
  }

  getDailyNote(date: any) {
    // Borrowed from the Slated plugin:
    // https://github.com/tgrosinger/slated-obsidian/blob/main/src/vault.ts#L17
    const desiredNote = getDailyNote(date, getAllDailyNotes());
    if (desiredNote) {
      console.log("Note exists");
      return Promise.resolve(desiredNote);
    } else {
      console.log("Creating daily note");
      return Promise.resolve(createDailyNote(date));
    }
  }
}
