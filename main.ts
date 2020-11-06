import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
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

  // processDate can be called by other plugins in order to use this plugin's natural language date engine
  // input: the natural language date plugin object (to make sure the function pulls settings from the right place) and some natural language date string
  // returns a date string formatted with Obsidian's daily note syntax (via Natural Language Date's settings for this syntax) 
  processDate(plugin: any, someDate: string) {
    var _this = plugin;
    var currentFormat = _this.settings.format;
    console.log("Current format: " + currentFormat);
    var date = _this.getDateString(someDate);
    var formattedDate = (window as any)
      .moment(date)
      .format(currentFormat);
    return formattedDate;
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
    }
  }

  adjustCursor(editor: any, cursor: any, newStr: string, oldStr: string) {
    var cursorOffset = newStr.length - oldStr.length;
    editor.setCursor({ line: cursor.line, ch: cursor.ch + cursorOffset });
  }
}

class NLDSettings {
  format: string = "YYYY-MM-DD";
  weekStart: string = "Monday";
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
  }
}
