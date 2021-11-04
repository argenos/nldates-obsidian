import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";
import t from "../lang/helper";

export default class DateSuggest extends CodeMirrorSuggest<string> {
  plugin: NaturalLanguageDates;
  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app, plugin.settings.autocompleteTriggerPhrase);
    this.plugin = plugin;

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

    this.setInstructions((containerEl) => {
      containerEl.createDiv("prompt-instructions", (instructions) => {
        instructions.createDiv("prompt-instruction", (instruction) => {
          instruction.createSpan({
            cls: "prompt-instruction-command",
            text: "Shift",
          });
          instruction.createSpan({
            text: "Keep text as alias",
          });
        });
      });
    });
  }

  getSuggestions(inputStr: string): string[] {
    // handle no matches
    const suggestions = this.getDateSuggestions(inputStr);
    return suggestions.length ? suggestions : [ inputStr ];
  }

  getDateSuggestions(inputStr: string): string[] {
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
      const timeDelta = relativeDate[1];
      return [
        `in ${timeDelta} minutes`,
        `in ${timeDelta} hours`,
        `in ${timeDelta} days`,
        `in ${timeDelta} weeks`,
        `in ${timeDelta} months`,
        `${timeDelta} days ago`,
        `${timeDelta} weeks ago`,
        `${timeDelta} months ago`,
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

    const head = this.getStartPos();
    const anchor = this.cmEditor.getCursor();

    let dateStr = this.plugin.parseDate(suggestion).formattedString;
    if (this.plugin.settings.autosuggestToggleLink) {
      if (includeAlias) {
        dateStr = `[[${dateStr}|${suggestion}]]`;
      } else {
        dateStr = `[[${dateStr}]]`;
      }
    }

    this.cmEditor.replaceRange(dateStr, head, anchor);
    this.close();
  }
}
