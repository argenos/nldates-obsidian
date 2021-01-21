import {
  App,
  Modal,
  MomentFormatComponent,
  Plugin,
  PluginSettingTab,
  Setting,
  TextComponent,
  ButtonComponent,
  MarkdownView,
  ToggleComponent,
} from "obsidian";

import chrono from "chrono-node";

var getLastDayOfMonth = function (y: any, m: any) {
  return new Date(y, m, 0).getDate();
};

const custom = chrono.casual.clone();

custom.parsers.push({
  pattern: () => {
    return /\bChristmas\b/i;
  },
  extract: (context: any, match: RegExpMatchArray) => {
    return {
      day: 25,
      month: 12,
    };
  },
});

interface NLDResult {
  formattedString: string;
  date: Date;
  moment: any;
}

export default class NaturalLanguageDates extends Plugin {
  settings: NLDSettings;

  onInit() {}

  async onload() {
    console.log("Loading natural language date parser plugin");
    await this.loadSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.onTrigger("replace"),
      hotkeys: [{
        modifiers: ["Mod"],
        key: "y"
      }],
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
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new ParseMomentModal(this.app, this).open();
          }
          return true;
        }
        return false;
      },
      hotkeys: [],
    });

    this.addSettingTab(new NLDSettingsTab(this.app, this));
  }

  onunload() {
    console.log("Unloading natural language date parser plugin");
  }

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  getParsedDate(selectedText: string): Date {
    var nextDateMatch = selectedText.match(/next\s([\w]+)/i);
    var lastDayOfMatch = selectedText.match(
      /(last day of|end of)\s*([^\n\r]*)/i
    );
    var midOf = selectedText.match(/mid\s([\w]+)/i);

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return custom.parseDate(`next ${this.settings.weekStart}`, new Date(), {
        forwardDate: true,
      });
    } else if (nextDateMatch && nextDateMatch[1] === "month") {
      var thisMonth = custom.parseDate("this month", new Date(), {
        forwardDate: true,
      });
      return custom.parseDate(selectedText, thisMonth, {
        forwardDate: true,
      });
    } else if (nextDateMatch && nextDateMatch[1] === "year") {
      var thisYear = custom.parseDate("this year", new Date(), {
        forwardDate: true,
      });
      return custom.parseDate(selectedText, thisYear, {
        forwardDate: true,
      });
    } else if (lastDayOfMatch) {
      var tempDate = custom.parse(lastDayOfMatch[2]);
      var year = tempDate[0].start.get("year"),
        month = tempDate[0].start.get("month");
      var lastDay = getLastDayOfMonth(year, month);
      return custom.parseDate(`${year}-${month}-${lastDay}`, new Date(), {
        forwardDate: true,
      });
    } else if (midOf) {
      return custom.parseDate(`${midOf[1]} 15th`, new Date(), {
        forwardDate: true,
      });
    } else {
      return custom.parseDate(selectedText, new Date(), {});
    }
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
      ch: cursor.ch
    });
    var wordStart = word.anchor.ch;
    var wordEnd = word.head.ch;

    return {
      start: {
        line: line,
        ch: wordStart
      },
      end: {
        line: line,
        ch: wordEnd
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
    let date = this.getParsedDate(dateString);
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
    let date = this.getParsedDate(dateString);
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

  onTrigger(mode: string) {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    var cursor = editor.getCursor();
    var selectedText = this.getSelectedText(editor);

    let date = this.parseDate(selectedText);

    if (!date.moment.isValid()) {
      editor.setCursor({
        line: cursor.line,
        ch: cursor.ch
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
      ch: cursor.ch + cursorOffset
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
}

interface NLDSettings {
  format: string;
  timeFormat: string;
  separator: string;
  weekStart: string;
  modalToggleTime: boolean;
  modalToggleLink: boolean;
  modalMomentFormat: string;
}

const DEFAULT_SETTINGS: NLDSettings = {
  format: "YYYY-MM-DD",
  timeFormat: "HH:mm",
  separator: " ",
  weekStart: "Monday",
  modalToggleTime: false,
  modalToggleLink: false,
  modalMomentFormat: "YYYY-MM-DD HH:mm",
}

class NLDSettingsTab extends PluginSettingTab {
  plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app, plugin);
    this.plugin = plugin;
  }


  display(): void {
    let {
      containerEl
    } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Output format for parsed dates")
      .addMomentFormat((text) =>
        text
        .setDefaultFormat("YYYY-MM-DD")
        .setValue(this.plugin.settings.format)
        .onChange(async (value) => {
          if (value === "") {
            this.plugin.settings.format = "YYYY-MM-DD";
          } else {
            this.plugin.settings.format = value.trim();
          }
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("Which day to consider as the start of the week")
      .addDropdown((day) =>
        day
        .addOption("Monday", "Monday")
        .addOption("Sunday", "Sunday")
        .setValue(this.plugin.settings.weekStart)
        .onChange(async (value) => {
          this.plugin.settings.weekStart = value.trim();
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", {
      text: "Hotkey formatting settings"
    });

    new Setting(containerEl)
      .setName("Time format")
      .setDesc("Format for the hotkeys that include the current time")
      .addMomentFormat((text) =>
        text
        .setDefaultFormat("HH:mm")
        .setValue(this.plugin.settings.timeFormat)
        .onChange(async (value) => {
          if (value === "") {
            this.plugin.settings.timeFormat = "HH:mm";
          } else {
            this.plugin.settings.timeFormat = value.trim();
          }
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Separator")
      .setDesc("Separator between date and time for entries that have both")
      .addText((text) =>
        text
        .setPlaceholder("Separator is empty")
        .setValue(this.plugin.settings.separator)
        .onChange(async (value) => {
          this.plugin.settings.separator = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

class ParseMomentModal extends Modal {
  parsedDateString = "";
  activeView: MarkdownView;
  activeEditor: CodeMirror.Editor;
  activeCursor: CodeMirror.Position;
  plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    this.activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!this.activeView) return;
    this.activeEditor = this.activeView.sourceMode.cmEditor;
    this.activeCursor = this.activeEditor.getCursor();
  }

  onOpen() {
    let {
      contentEl
    } = this;

    contentEl.appendText("Date: ");

    let inputDateField = new TextComponent(contentEl).setPlaceholder("Date");
    contentEl.createEl("br");
    contentEl.appendText("Format: ");

    let momentFormatField = new MomentFormatComponent(contentEl)
      .setDefaultFormat("YYYY-MM-DD HH:mm")
      .setValue(this.plugin.settings.modalMomentFormat)
      .onChange((value) => {
        this.plugin.settings.modalMomentFormat = value ? value : "YYYY-MM-DD HH:mm";
        this.plugin.saveSettings();
      });

    contentEl.createEl("br");

    contentEl.appendText("Add as link?");
    let toggleLink = new ToggleComponent(contentEl)
      .setValue(this.plugin.settings.modalToggleLink)
      .onChange((value) => {
        this.plugin.settings.modalToggleLink = value;
        this.plugin.saveSettings();
      });
    contentEl.createEl("br");

    let inputButton = new ButtonComponent(contentEl)
      .setButtonText("Insert date")
      .onClick(() => {
        let parsedDate = this.plugin.parseDate(inputDateField.getValue());
        this.parsedDateString = parsedDate.moment.format(
          momentFormatField.getValue()
        );
        if (!parsedDate.moment.isValid()) this.parsedDateString = "";
        if (toggleLink.getValue() && this.parsedDateString !== "")
          this.parsedDateString = `[[${this.parsedDateString}]]`;
        this.activeEditor.focus();
        this.activeEditor.setCursor(this.activeCursor);
        this.plugin.insertDateString(
          this.parsedDateString,
          this.activeEditor,
          this.activeCursor
        );
        this.close();
      });
    inputDateField.inputEl.focus();
  }

  onClose() {
    let {
      contentEl
    } = this;
    contentEl.empty();
  }
}
