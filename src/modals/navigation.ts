import { App, Scope, setIcon, SuggestModal } from "obsidian";
import { NLDResult } from "src/parser";
import NaturalLanguageDates from "src/main";
import { Moment } from "moment";
import {
  getDailyNoteSettings,
  getMonthlyNoteSettings,
  getWeeklyNoteSettings,
} from "obsidian-daily-notes-interface";

interface DateNavigationItem {
  file: any;
  moment: Moment;
  date: string;
}

const DEFAULT_INSTRUCTIONS = [
  { command: "↑↓", purpose: "to navigate" },
  { command: "↵", purpose: "to open" },
  { command: "ctrl ↵", purpose: "to open in a new pane" },
  { command: "esc", purpose: "to dismiss" },
];

export class NLDNavigator extends SuggestModal<DateNavigationItem> {
  plugin: NaturalLanguageDates;
  scope: Scope;
  mode: string;
  newPane: boolean;
  periodicNotes: boolean;
  meetingNotes: boolean;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    this.mode = "Daily";
    this.newPane = false;
    this.setInstructions(DEFAULT_INSTRUCTIONS);
    this.setPlaceholder("Type date to find daily note");
    this.periodicNotes = false;
    this.meetingNotes = false;

    this.scope.register(["Mod"], "Enter", (evt: KeyboardEvent) => {
      // @ts-ignore
      this.chooser.useSelectedItem(evt);
      return false;
    });

    this.scope.register(["Alt"], "ArrowRight", (evt: KeyboardEvent) => {
      console.log("Change resolution");
    });

    this.scope.register(["Alt"], "ArrowUp", (evt: KeyboardEvent) => {
      console.log("Toggle non-periodic notes");
    });
  }

  /**
   * Return a list of suggested dates based on the parsed result
   * @param query string
   * @param parsedResult NLDResult
   * @returns Moment[]
   */
  getDaySuggestions(query: string, parsedResult: NLDResult) {
    let start = window.moment(parsedResult.moment);
    let dateArray = [];
    let end;
    console.log(start);

    if (query.includes("week")) {
      end = window.moment(start).endOf("week");
    } else if (query.includes("month")) {
      end = window.moment(start).endOf("month");
    } else {
      end = window.moment(start);
    }

    do {
      dateArray.push(window.moment(start.format("YYYY-MM-DD")));
      start.add(1, "day");
    } while (!start.isAfter(end, "day"));

    return dateArray;
  }

  changeMode(mode: string) {
    this.mode = mode;
  }

  getDailyNoteFile(dateString: string, other:boolean) {
    let files = this.app.vault.getMarkdownFiles(); // Get all links (including unresolved ones) and find their files
    const dateFile = files.filter(
      (e) =>
        e.name.contains(dateString) || //hat-tip 🎩 to @MrJackPhil for this little workflow
        e.path.contains(dateString) ||
        e.basename.contains(dateString)
    );
    return dateFile;
  }

  getSuggestions(query: string): DateNavigationItem[] {
    let suggestions = [];

    let nldates = this.plugin;
    let parsedResult: NLDResult = nldates.parseDate(query);
    let format = this.plugin.settings.format;

    // let settings = getDailyNoteSettings();
    // let weeklySettings = getWeeklyNoteSettings();
    // let monthlySettings = getMonthlyNoteSettings();

    // if (query.contains("weeks")) {
    //   console.log("Multiple weeks")
    // } else if (query.contains("week")){
    //   console.log("A single week")
    // }

    if (parsedResult.moment.isValid()) {
      let dates = this.getDaySuggestions(query, parsedResult);
      for (let date of dates) {
        let dateFile = this.getDailyNoteFile(date.format(format), false);
        if (dateFile.length > 0) {
          dateFile.sort((a, b) => (a.name < b.name ? 1 : -1));
          for (let f of dateFile) {
            suggestions.push({
              date: date.format(format),
              file: f,
              moment: window.moment(date),
            });
          }
        } else {
          suggestions.push({
            date: date.format(format),
            file: null,
            moment: window.moment(date),
          });
        }
      }
      return suggestions;
    } else {
      return [];
    }
  }

  renderSuggestion(value: DateNavigationItem, el: HTMLElement) {
    if (!value.file) {
      el.setText(value.date);
      el.createEl("kbd", { cls: "suggestion-hotkey", text: "Enter to create" });
      return;
    } else if (value.date !== value.file.basename) {
      el.setText(value.file.basename);
      el.createEl("div", { cls: "suggestion-note", text: value.date });
      el.createEl("span", { cls: "suggestion-flair", prepend: true }, (el) => {
        setIcon(el, "calendar-with-checkmark", 13);
        // setTooltip(el, i18n('interface.tooltip.alias'));
      });
      return;
    }

    el.appendText(value.file.basename);
  }

  async onChooseSuggestion(
    item: DateNavigationItem,
    evt: MouseEvent | KeyboardEvent
  ) {
    console.log(item);
    console.log(evt);

    const newPane = evt.ctrlKey;

    const { workspace } = this.app;

    let leaf = workspace.getLeaf(newPane);
    //   await leaf.openFile(item.file);
    //   workspace.setActiveLeaf(leaf);

    if (item.moment.isValid()) {
      let dailyNote = await this.plugin.getDailyNote(item.moment);

      let leaf = workspace.getLeaf(newPane);
      await leaf.openFile(dailyNote);

      workspace.setActiveLeaf(leaf);
    }
  }
}
