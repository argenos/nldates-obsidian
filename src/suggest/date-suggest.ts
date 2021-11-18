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
import { generateMarkdownLink } from "src/utils";


export default class DateSuggest extends EditorSuggest<string> {
  private plugin: NaturalLanguageDates;
  private app: App;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.app = app;
    this.plugin = plugin;

    // @ts-ignore
    this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
      // @ts-ignore
      this.suggestions.useSelectedItem(evt);
      return false;
    });

    if (this.plugin.settings.autosuggestToggleLink) {
      this.setInstructions([{ command: "Shift", purpose: "Keep text as alias" }]);
    }
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    // handle no matches
    const suggestions = this.getDateSuggestions(context);
    return suggestions.length ? suggestions : [ context.query ];
  }

  getDateSuggestions(context: EditorSuggestContext): string[] {
    return this.unique(this.plugin.settings.languages.flatMap(
      language => {
        let suggestions = this.getTimeSuggestions(context.query, language);
        if (suggestions)
          return suggestions;
        
        suggestions = this.getImmediateSuggestions(context.query, language);
        if (suggestions)
          return suggestions;

        suggestions = this.getRelativeSuggestions(context.query, language);
        if (suggestions)
          return suggestions;

        return this.defaultSuggestions(context.query, language);
      }
    ));
  }

  private getTimeSuggestions(inputStr: string, lang: string): string[] {
    if (inputStr.match(new RegExp(`^${t("time", lang)}`))) {
      return [
        t("now", lang),
        t("plusminutes", lang, { timeDelta: "15" }),
        t("plushour", lang, { timeDelta: "1" }),
        t("minusminutes", lang, { timeDelta: "15" }),
        t("minushour", lang, { timeDelta: "1" }),
      ]
        .map(val => `${t("time", lang)}:${val}`)
        .filter(item => item.toLowerCase().startsWith(inputStr));
    }
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
    return [
      t("today", lang),
      t("yesterday", lang),
      t("tomorrow", lang),
    ].filter(item => item.toLowerCase().startsWith(inputStr));
  }

  renderSuggestion(suggestion: string, el: HTMLElement): void {
    el.setText(suggestion);
  }

  selectSuggestion(suggestion: string, event: KeyboardEvent | MouseEvent): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      return;
    }

    const includeAlias = event.shiftKey;
    let dateStr = "";
    let makeIntoLink = this.plugin.settings.autosuggestToggleLink;

    if (this.suggestionIsTime(suggestion)) {
      const timePart = suggestion.substring(5);
      dateStr = this.plugin.parseTime(timePart).formattedString;
      makeIntoLink = false;
    } else {
      dateStr = this.plugin.parseDate(suggestion).formattedString;
    }

    if (makeIntoLink) {
      dateStr = generateMarkdownLink(
        this.app,
        dateStr,
        includeAlias ? suggestion : undefined
      );
    }

    activeView.editor.replaceRange(dateStr, this.context.start, this.context.end);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile
  ): EditorSuggestTriggerInfo {
    if (!this.plugin.settings.isAutosuggestEnabled) {
      return null;
    }

    const triggerPhrase = this.plugin.settings.autocompleteTriggerPhrase;
    const startPos = this.context?.start || {
      line: cursor.line,
      ch: cursor.ch - triggerPhrase.length,
    };

    if (!editor.getRange(startPos, cursor).startsWith(triggerPhrase)) {
      return null;
    }

    const precedingChar = editor.getRange(
      {
        line: startPos.line,
        ch: startPos.ch - 1,
      },
      startPos
    );

    if (precedingChar && /[`a-zA-Z0-9]/.test(precedingChar)) {
      return null;
    }

    return {
      start: startPos,
      end: cursor,
      query: editor.getRange(startPos, cursor).substring(triggerPhrase.length),
    };
  }

  protected suggestionIsTime(suggestion: string): boolean {
    return this.plugin.settings.languages.some(lang => suggestion.startsWith(t("time", lang)))
  }

  protected unique(suggestions: string[]) : string[] {
    return suggestions.filter(function(item, pos) {
      return suggestions.indexOf(item) == pos;
    })
  }
}
