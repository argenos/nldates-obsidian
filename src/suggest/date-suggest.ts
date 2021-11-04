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
import t from "../lang/helper";



export default class DateSuggest extends EditorSuggest<string> {
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

  getSuggestions(context: EditorSuggestContext): string[] {
    // handle no matches
    const suggestions = this.getDateSuggestions(context.query);
    return suggestions.length ? suggestions : [ context.query ];
  }

  getDateSuggestions(inputStr: string): string[] {
    if (inputStr.match(/^time/)) {
      return ["now", "+15 minutes", "+1 hour", "-15 minutes", "-1 hour"]
        .map(val => `time:${val}`)
        .filter(item => item.toLowerCase().startsWith(inputStr));
    }

    return this.plugin.settings.languages.flatMap(
      language => {
        let suggestions = this.getImmediateSuggestions(inputStr, language);
        if (suggestions)
          return suggestions

        suggestions = this.getRelativeSuggestions(inputStr, language);
        if (suggestions)
          return suggestions;

        return this.defaultSuggestions(inputStr, language);
      }
    );
  }

  private getImmediateSuggestions(inputStr: string, lang: string): string[] {
    const regexp = new RegExp(`(${t("next", lang)}|${t("last", lang)}|${t("this", lang)})`, "i")
    const match = inputStr.match(regexp)
    if (match) {
      const reference = match[1]
      return [
        t("week", lang),
        t("month", lang),
        t("year", lang),
        t("sunday", lang),
        t("monday", lang),
        t("tuesday", lang),
        t("wednesday", lang),
        t("thursday", lang),
        t("friday", lang),
        t("saturday", lang),
      ]
        .map(val => `${reference} ${val}`)
        .filter(items => items.toLowerCase().startsWith(inputStr));
    }
  }

  private getRelativeSuggestions(inputStr: string, lang: string): string[] {
    const regexp = new RegExp(`^(${t("in", lang)} )?([+-]?\\d+)`, "i")
    const relativeDate = inputStr.match(regexp);
    if (relativeDate) {
      const timeDelta = relativeDate[relativeDate.length - 1];
      return [
        t("inminutes", lang, { timeDelta }),
        t("inhours", lang, { timeDelta }),
        t("indays", lang, { timeDelta }),
        t("inweeks", lang, { timeDelta }),
        t("inmonths", lang, { timeDelta }),
        t("daysago", lang, { timeDelta }),
        t("weeksago", lang, { timeDelta }),
        t("monthsago", lang, { timeDelta }),
      ].filter(items => items.toLowerCase().startsWith(inputStr));
    }
  }

  private defaultSuggestions(inputStr: string, lang: string): string[] {
    const suggestions = [
      t("today", lang),
      t("yesterday", lang),
      t("tomorrow", lang),
    ];

    return suggestions.filter(item => item.toLowerCase().startsWith(inputStr));
  }

  renderSuggestion(suggestion: string, el: HTMLElement): void {
    el.setText(suggestion);
  }

  selectSuggestion(
    suggestion: string,
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

    if (suggestion.startsWith("time:")) {
      const timePart = suggestion.substring(5);
      dateStr = this.plugin.parseTime(timePart).formattedString;
      makeIntoLink = false;
    } else {
      dateStr = this.plugin.parseDate(suggestion).formattedString;
    }

    if (makeIntoLink) {
      if (includeAlias) {
        dateStr = `[[${dateStr}|${suggestion}]]`;
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
