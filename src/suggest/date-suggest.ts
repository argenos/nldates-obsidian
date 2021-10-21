import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  MarkdownView,
  TFile,
} from "obsidian";
import type NaturalLanguageDates from "src/main";

interface IDateCompletion {
  label: string;
}

export default class DateSuggest extends EditorSuggest<IDateCompletion> {
  plugin: NaturalLanguageDates;
  app: App;

  protected cmEditor: Editor;

  private startPos: CodeMirror.Position;
  private triggerPhrase: string;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.app = app;
    this.plugin = plugin;
    this.triggerPhrase = this.plugin.settings.autocompleteTriggerPhrase;
    this.updateInstructions();
  }

  open(): void {
    super.open();
    // update the instructions since they are settings-dependent
    this.updateInstructions();
  }

  protected updateInstructions(): void {
    if (!this.plugin.settings.autosuggestToggleLink) {
      // Instructions only apply for links
      return;
    }

    // this.setInstructions((containerEl) => {
    //   containerEl.createDiv("prompt-instructions", (instructions) => {
    //     instructions.createDiv("prompt-instruction", (instruction) => {
    //       instruction.createSpan({
    //         cls: "prompt-instruction-command",
    //         text: "Shift",
    //       });
    //       instruction.createSpan({
    //         text: "Keep text as alias",
    //       });
    //     });
    //   });
    // });
  }

  getSuggestions(context: EditorSuggestContext): IDateCompletion[] {
    // handle no matches
    const suggestions = this.getDateSuggestions(context.query);
    if (suggestions.length) {
      return suggestions;
    } else {
      return [{ label: context.query }];
    }
  }

  getDateSuggestions(inputStr: string): IDateCompletion[] {
    if (inputStr.match(/^time/)) {
      return ["now", "+15 minutes", "+1 hour", "-15 minutes", "-1 hour"]
        .map((val) => ({ label: `time:${val}` }))
        .filter((item) => item.label.toLowerCase().startsWith(inputStr));
    }
    if (inputStr.match(/(next|last|this)/i)) {
      const reference = inputStr.match(/(next|last|this)/i)[1];
      return [
        "week",
        "month",
        "year",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ]
        .map((val) => ({ label: `${reference} ${val}` }))
        .filter((items) => items.label.toLowerCase().startsWith(inputStr));
    }

    const relativeDate =
      inputStr.match(/^in ([+-]?\d+)/i) || inputStr.match(/^([+-]?\d+)/i);
    if (relativeDate) {
      const timeDelta = relativeDate[1];
      return [
        { label: `in ${timeDelta} minutes` },
        { label: `in ${timeDelta} hours` },
        { label: `in ${timeDelta} days` },
        { label: `in ${timeDelta} weeks` },
        { label: `in ${timeDelta} months` },
        { label: `${timeDelta} days ago` },
        { label: `${timeDelta} weeks ago` },
        { label: `${timeDelta} months ago` },
      ].filter((items) => items.label.toLowerCase().startsWith(inputStr));
    }

    return [
      { label: "Today" },
      { label: "Yesterday" },
      { label: "Tomorrow" },
    ].filter((items) => items.label.toLowerCase().startsWith(inputStr));
  }

  renderSuggestion(suggestion: IDateCompletion, el: HTMLElement): void {
    el.setText(suggestion.label);
  }

  selectSuggestion(
    suggestion: IDateCompletion,
    event: KeyboardEvent | MouseEvent
  ): void {
    const includeAlias = event.shiftKey;

    const { workspace } = this.app;
    const activeView = workspace.getActiveViewOfType(MarkdownView);

    if (!activeView) {
      return;
    }
    const editor = activeView.editor;
    const head = this.startPos;
    const anchor = editor.getCursor();
    let dateStr = "";
    let makeIntoLink = this.plugin.settings.autosuggestToggleLink;

    if (suggestion.label.startsWith("time:")) {
      const timePart = suggestion.label.substring(5);
      dateStr = this.plugin.parseTime(timePart).formattedString;
      makeIntoLink = false;
    } else {
      dateStr = this.plugin.parseDate(suggestion.label).formattedString;
    }

    if (makeIntoLink) {
      if (includeAlias) {
        dateStr = `[[${dateStr}|${suggestion.label}]]`;
      } else {
        dateStr = `[[${dateStr}]]`;
      }
    }

    editor.replaceRange(dateStr, head, anchor);
    this.close();
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile
  ): EditorSuggestTriggerInfo {
    const lineContents = editor.getLine(cursor.line);

    const match = lineContents
      .substring(0, cursor.ch)
      .match(/(?:^|\s|\W)(@[^@]*$)/);

    if (match === null) {
      return null;
    }

    const triggerInfo = this.getTriggerInfo(match, cursor);
    console.log(triggerInfo);

    this.startPos = triggerInfo.start;
    this.cmEditor = editor;

    return triggerInfo;
  }

  protected getTriggerInfo(
    match: RegExpMatchArray,
    cursor: EditorPosition
  ): EditorSuggestTriggerInfo {
    return {
      start: this.getStartPos(match, cursor.line),
      end: cursor,
      query: match[1].substring(this.triggerPhrase.length),
    };
  }

  protected getStartPos(match: RegExpMatchArray, line: number): EditorPosition {
    return {
      line: line,
      ch: match.index + match[0].length - match[1].length,
    };
  }
}
