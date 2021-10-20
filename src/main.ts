import { Moment } from "moment";
import {
  EditorRange,
  MarkdownView,
  ObsidianProtocolData,
  Plugin,
  TFile,
  Editor,
  EditorPosition,
} from "obsidian";

import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";

import DatePickerModal from "./modals/date-picker";
import NLDParser, { NLDResult } from "./parser";
import { NLDSettingsTab, NLDSettings, DEFAULT_SETTINGS } from "./settings";
import DateSuggest from "./suggest/date-suggest";

export default class NaturalLanguageDates extends Plugin {
  private parser: NLDParser;
  private autosuggest: DateSuggest;
  public settings: NLDSettings;

  async onload(): Promise<void> {
    console.log("Loading natural language date parser plugin");
    await this.loadSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.getParseCommand("replace"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-dates-link",
      name: "Parse natural language date (as link)",
      callback: () => this.getParseCommand("link"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-date-clean",
      name: "Parse natural language date (as plain text)",
      callback: () => this.getParseCommand("clean"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-parse-time",
      name: "Parse natural language time",
      callback: () => this.getParseCommand("time"),
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
      callback: () => this.getCurrentDateCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-time",
      name: "Insert the current time",
      callback: () => this.getCurrentTimeCommand(),
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

    this.tryToSetupAutosuggest();

    this.app.workspace.onLayoutReady(() => {
      // initialize the parser when layout is ready so that the correct locale is used
      this.parser = new NLDParser();
    });
  }

  onunload(): void {
    console.log("Unloading natural language date parser plugin");
  }

  tryToSetupAutosuggest(): void {
    if (
      this.settings.autocompleteTriggerPhrase &&
      this.settings.isAutosuggestEnabled
    ) {
      this.autosuggest = new DateSuggest(this.app, this);

      this.registerCodeMirror((cm: CodeMirror.Editor) => {
        cm.on("change", this.autosuggestHandler);
      });
    } else {
      this.autosuggest = null;
      this.registerCodeMirror((cm: CodeMirror.Editor) => {
        cm.off("change", this.autosuggestHandler);
      });
    }
  }

  autosuggestHandler = (
    cmEditor: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChange
  ): boolean => {
    return this.autosuggest?.update(cmEditor, changeObj);
  };

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    // rebuild autosuggest in case trigger phrase changed, or it was disabled
    this.tryToSetupAutosuggest();
    await this.saveData(this.settings);
  }

  getSelectedText(editor: Editor): string {
    if (editor.somethingSelected()) {
      return editor.getSelection();
    } else {
      const wordBoundaries = this.getWordBoundaries(editor);
      editor.setSelection(wordBoundaries.from, wordBoundaries.to); // TODO check if this needs to be updated/improved
      return editor.getSelection();
    }
  }

  getWordBoundaries(editor: any): EditorRange {
    const cursor = editor.getCursor();

    if (editor.cm instanceof window.CodeMirror) {
      // CM5
      const line = cursor.line;
      const word = editor.findWordAt({
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
      const pos = this.posToOffset(editor.cm.state.doc, cursor);
      const word = editor.cm.state.wordAt(pos);
      const wordStart = this.offsetToPos(editor.cm.state.doc, word.from);
      const wordEnd = this.offsetToPos(editor.cm.state.doc, word.to);
      return {
        from: wordStart,
        to: wordEnd,
      };
    }
  }

  posToOffset(doc: any, pos: any) {
    return doc.line(pos.line + 1).from + pos.ch;
  }

  offsetToPos(doc: any, offset: any) {
    let line = doc.lineAt(offset);
    return { line: line.number - 1, ch: offset - line.from };
  }

  getMoment(date: Date): Moment {
    return window.moment(date);
  }

  getFormattedDate(date: Date): string {
    return this.getMoment(date).format(this.settings.format);
  }

  getFormattedTime(date: Date): string {
    return this.getMoment(date).format(this.settings.timeFormat);
  }

  /*
  @param dateString: A string that contains a date in natural language, e.g. today, tomorrow, next week
  @returns NLDResult: An object containing the date, a cloned Moment and the formatted string.

  */
  parseDate(dateString: string): NLDResult {
    const date = this.parser.getParsedDate(dateString, this.settings.weekStart);
    const formattedString = this.getFormattedDate(date);
    if (formattedString === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    return {
      formattedString,
      date,
      moment: this.getMoment(date),
    };
  }

  parseTime(dateString: string): NLDResult {
    const date = this.parser.getParsedDate(dateString, this.settings.weekStart);
    const formattedString = this.getFormattedTime(date);
    if (formattedString === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    return {
      formattedString,
      date,
      moment: this.getMoment(date),
    };
  }

  parseTruthy(flag: string): boolean {
    return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
  }

  getParseCommand(mode: string): void {
    const { workspace } = this.app;
    const activeView = workspace.getActiveViewOfType(MarkdownView);

    if (activeView) {
      // The active view might not be a markdown view
      const editor = activeView.editor;
      const cursor = editor.getCursor();
      const selectedText = this.getSelectedText(editor);

      let date = this.parseDate(selectedText);

      if (!date.moment.isValid()) {
        // Do nothing
        editor.setCursor({
          line: cursor.line,
          ch: cursor.ch,
        });
      } else {
        //mode == "replace"
        let newStr = `[[${date.formattedString}]]`;

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
  }

  adjustCursor(
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

  insertMomentCommand(date: Date, format: string) {
    const { workspace } = this.app;
    const activeView = workspace.getActiveViewOfType(MarkdownView);

    if (activeView) {
      // The active view might not be a markdown view
      const editor = activeView.editor;
      editor.replaceSelection(this.getMoment(date).format(format));
    }
  }

  getNowCommand(): void {
    const format = `${this.settings.format}${this.settings.separator}${this.settings.timeFormat}`;
    const date = new Date();
    this.insertMomentCommand(date, format);
  }

  getCurrentDateCommand(): void {
    const format = this.settings.format;
    const date = new Date();
    this.insertMomentCommand(date, format);
  }

  getCurrentTimeCommand(): void {
    const format = this.settings.timeFormat;
    const date = new Date();
    this.insertMomentCommand(date, format);
  }

  insertDateString(
    dateString: string,
    editor: Editor,
    _cursor: EditorPosition
  ): void {
    editor.replaceSelection(dateString);
  }

  async actionHandler(params: ObsidianProtocolData): Promise<void> {
    const { workspace } = this.app;

    const date = this.parseDate(params.day);
    const newPane = this.parseTruthy(params.newPane || "yes");

    if (date.moment.isValid()) {
      const dailyNote = await this.getDailyNote(date.moment);

      let leaf = workspace.activeLeaf;
      if (newPane) {
        leaf = workspace.splitActiveLeaf();
      }

      await leaf.openFile(dailyNote);

      workspace.setActiveLeaf(leaf);
    }
  }

  async getDailyNote(date: Moment): Promise<TFile | null> {
    // Borrowed from the Slated plugin:
    // https://github.com/tgrosinger/slated-obsidian/blob/main/src/vault.ts#L17
    const desiredNote = getDailyNote(date, getAllDailyNotes());
    if (desiredNote) {
      return Promise.resolve(desiredNote);
    }
    return createDailyNote(date);
  }
}
