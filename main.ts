import {
  App,
  Modal,
  MomentFormatComponent,
  Notice,
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
    this.settings = (await this.loadData()) || new NLDSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.onTrigger(),
      hotkeys: [{ modifiers: ["Mod"], key: "y" }],
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
      id: "nlp-search",
      name: "Date picker",
      // callback: () => this.getDateRange(),
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new ParseMomentModal(this.app).open();
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
      return custom.parseDate(selectedText, new Date(), {
        forwardDate: true,
      });
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
    var word = editor.findWordAt({ line: line, ch: cursor.ch });
    var wordStart = word.anchor.ch;
    var wordEnd = word.head.ch;

    return {
      start: { line: line, ch: wordStart },
      end: { line: line, ch: wordEnd },
    };
  }

  getMoment(date: Date): any {
    return (window as any).moment(date);
  }

  getFormattedDate(date: Date): string {
    var formattedDate = this.getMoment(date).format(this.settings.format);
    return formattedDate;
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

  onTrigger() {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    var cursor = editor.getCursor();
    var selectedText = this.getSelectedText(editor);

    let date = this.parseDate(selectedText);

    if (!date.moment.isValid()) {
      editor.setCursor({ line: cursor.line, ch: cursor.ch });
    } else {
      var newStr = `[[${date.formattedString}]]`;
      editor.replaceSelection(newStr);
      this.adjustCursor(editor, cursor, newStr, selectedText);
      editor.focus();
    }
  }

  adjustCursor(editor: any, cursor: any, newStr: string, oldStr: string) {
    var cursorOffset = newStr.length - oldStr.length;
    editor.setCursor({ line: cursor.line, ch: cursor.ch + cursorOffset });
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

class NLDSettings {
  format: string = "YYYY-MM-DD";
  timeFormat: string = "HH:mm";
  separator: string = " ";
  weekStart: string = "Monday";
  modalToggleTime: boolean = false;
  modalToggleLink: boolean = false;
  modalMomentFormat: string = "YYYY-MM-DD HH:mm";
}

class NLDSettingsTab extends PluginSettingTab {
  display(): void {
    let { containerEl } = this;
    const plugin: any = (this as any).plugin;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Output format for parsed dates")
      .addMomentFormat((text) =>
        text
          .setDefaultFormat("YYYY-MM-DD")
          .setValue(plugin.settings.format)
          .onChange((value) => {
            if (value === "") {
              plugin.settings.format = "YYYY-MM-DD";
            } else {
              plugin.settings.format = value.trim();
            }
            plugin.saveData(plugin.settings);
          })
      );

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("Which day to consider as the start of the week")
      .addDropdown((day) =>
        day
          .setValue(plugin.settings.weekStart)
          .addOption("Monday", "Monday")
          .addOption("Sunday", "Sunday")
          .onChange((value) => {
            console.log(value);
            plugin.settings.weekStart = value.trim();
            console.log(plugin.settings);
            plugin.saveData(plugin.settings);
          })
      );

    containerEl.createEl("h3", { text: "Hotkey formatting settings" });

    new Setting(containerEl)
      .setName("Time format")
      .setDesc("Format for the hotkeys that include the current time")
      .addMomentFormat((text) =>
        text
          .setDefaultFormat("HH:mm")
          .setValue(plugin.settings.timeFormat)
          .onChange((value) => {
            if (value === "") {
              plugin.settings.timeFormat = "HH:mm";
            } else {
              plugin.settings.timeFormat = value.trim();
            }
            plugin.saveData(plugin.settings);
          })
      );

    new Setting(containerEl)
      .setName("Separator")
      .setDesc("Separator between date and time for entries that have both")
      .addText((text) =>
        text
          .setPlaceholder("Separator is empty")
          .setValue(plugin.settings.separator)
          .onChange((value) => {
            plugin.settings.separator = value;
            plugin.saveData(plugin.settings);
          })
      );
  }
}

class ParseMomentModal extends Modal {
  parsedDateString = "";
  activeView: MarkdownView;
  activeEditor: CodeMirror.Editor;
  activeCursor: CodeMirror.Position;

  constructor(app: App) {
    super(app);
    this.activeView = this.app.workspace.getActiveLeafOfViewType(MarkdownView);
    if (!this.activeView) return;
    this.activeEditor = this.activeView.sourceMode.cmEditor;
    this.activeCursor = this.activeEditor.getCursor();
  }

  onOpen() {
    let nldates = this.app.plugins.getPlugin("nldates-obsidian");
    let { contentEl } = this;
    const plugin: any = (this as any).plugin;

    contentEl.appendText("Date: ");

    let inputDateField = new TextComponent(contentEl).setPlaceholder("Date");
    contentEl.createEl("br");
    contentEl.appendText("Format: ");

    let momentFormatField = new MomentFormatComponent(contentEl)
      .setDefaultFormat("YYYY-MM-DD HH:mm")
      .setValue(nldates.settings.modalMomentFormat)
      .onChange((value) => {
        nldates.settings.modalMomentFormat = value ? value : "YYYY-MM-DD HH:mm";
        nldates.saveData(nldates.settings);
      });

    contentEl.createEl("br");
    // contentEl.appendText("Toggle time")

    // let toggleDate = new ToggleComponent(contentEl)
    // .setValue(nldates.settings.modalToggleTime)
    // .onChange((value) => {
    //   nldates.settings.modalToggleTime = value;
    //   nldates.saveData(nldates.settings);
    // });

    contentEl.appendText("Add as link?");
    let toggleLink = new ToggleComponent(contentEl)
      .setValue(nldates.settings.modalToggleLink)
      .onChange((value) => {
        nldates.settings.modalToggleLink = value;
        nldates.saveData(nldates.settings);
      });
    contentEl.createEl("br");

    let inputButton = new ButtonComponent(contentEl)
      .setButtonText("Insert date")
      .onClick(() => {
        let parsedDate = nldates.parseDate(inputDateField.getValue());
        this.parsedDateString = parsedDate.moment.format(
          momentFormatField.getValue()
        );
        if (!parsedDate.moment.isValid()) this.parsedDateString = "";
        if (toggleLink.getValue() && this.parsedDateString !== "")
          this.parsedDateString = `[[${this.parsedDateString}]]`;
        this.activeEditor.focus();
        this.activeEditor.setCursor(this.activeCursor);
        nldates.insertDateString(
          this.parsedDateString,
          this.activeEditor,
          this.activeCursor
        );
        this.close();
      });
    inputDateField.inputEl.focus();
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
