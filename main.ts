import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import chrono from "chrono-node";
import moment from "moment";

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

export default class NaturalLanguageDates extends Plugin {
  settings: NaturalLanguageDatesSettings;
  
  onInit() {}

  async onload() {
    console.log("Loading natural language date parser plugin");

    this.settings = await this.loadData() || new NaturalLanguageDatesSettings();

    this.addSettingTab(new NaturalLanguageDatesSettingsTab(this.app, this));

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.onTrigger(),
      hotkeys: [{ modifiers: ["Mod"], key: "y" }],
    });

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
      var momentDate = moment(date).format(this.settings.dateFormat)
      var newStr = `[[${momentDate}]]`;
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

class NaturalLanguageDatesSettings {
  dateFormat: string = "YYYY-MM-DD";
}

class NaturalLanguageDatesSettingsTab extends PluginSettingTab {
  uPop = document.createElement('b');
  plugin: any = (this as any).plugin

  display(): void {
    let { containerEl } = this;
    this.uPop.className = 'u-pop';
    containerEl.empty();

    new Setting(containerEl)
      .setName('Date Format')
      .setDesc(this.descriptionContent(this.plugin))
      .addText(text => text.setPlaceholder('Example: YYYY-MM-DD')
        .setValue((this.plugin.settings.dateFormat || '') + '')
        .onChange((value) => {
          this.plugin.settings.dateFormat = value.trim();
          this.plugin.saveData(this.plugin.settings);
          this.setCurrentSyntax();
        }));
  }

  descriptionContent(plugin: any): DocumentFragment {
    let descEl = document.createDocumentFragment();
    descEl.appendText('For more syntax, refer to ')
    let a = document.createElement('a');
    a.href = 'https://momentjs.com/docs/#/displaying/format/';
    a.text = 'format reference';
    a.target = '_blank';
    descEl.appendChild(a);
    descEl.appendChild(document.createElement('br'));
    descEl.appendText('Your current syntax lookslike this:');
    descEl.appendChild(document.createElement('br'));
    this.setCurrentSyntax();
    descEl.appendChild(this.uPop);
    return descEl;
  }

  setCurrentSyntax(): void {
    this.uPop.innerText = moment().format(this.plugin.settings.dateFormat);
  }
}