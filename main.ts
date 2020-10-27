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

var nextDate = new RegExp(/next\s(w+)/, "gi");

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

  getDateString(selectedText: string) {
    var nextDateMatch = selectedText.match(/next\s([\w]+)/i);
    var lastDayOfMatch = selectedText.match(
      /(last day of|end of)\s*([^\n\r]*)/i
    );
    var midOf = selectedText.match(/mid\s([\w]+)/i);

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return custom.parseDate("next monday", new Date(), {
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

  onTrigger() {
    let activeLeaf: any = this.app.workspace.activeLeaf;
    let editor = activeLeaf.view.sourceMode.cmEditor;
    var cursor = editor.getCursor();
    var selectedText = this.getSelectedText(editor);

    var date = this.getDateString(selectedText);

    if (date) {
      var isodate = date.toISOString().substring(0, 10);
      var formattedDate = (window as any)
        .moment(isodate)
        .format(this.settings.format);
      var newStr = `[[${formattedDate}]]`;
      editor.replaceSelection(newStr);
      this.adjustCursor(editor, cursor, newStr, selectedText);
    } else {
      editor.setCursor({ line: cursor.line, ch: cursor.ch });
    }
  }

  adjustCursor(editor: any, cursor: any, newStr: string, oldStr: string) {
    var cursorOffset = newStr.length - oldStr.length;
    editor.setCursor({ line: cursor.line, ch: cursor.ch + cursorOffset });
  }
}

class NLDSettings {
  format: string = "YYYY-MM-DD";
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
  }
}
