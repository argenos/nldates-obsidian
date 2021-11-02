import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";
import {translate} from "../locales/languages";

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

  getSuggestions(inputStr: string): Array<string> {
    // handle no matches
    const suggestions = this.getDateSuggestions(inputStr);
    return suggestions.length ? suggestions : [ inputStr ];
  }

  getDateSuggestions(inputStr: string): Array<string> {
    if (inputStr.match(/(next|last|this)/i)) {
      return this.getImmediateSuggestions(inputStr);
    }

    if (inputStr.match(/^(in )?([+-]?\d+)/i)) {
      return this.getRelativeSuggestions(inputStr);
    }

    return this.defaultSuggestions(inputStr);
  }

  private getImmediateSuggestions(inputStr: string): Array<string> {
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
      .map(val => `${reference} ${val}`)
      .filter(items => items.toLowerCase().startsWith(inputStr));
  }

  private getRelativeSuggestions(inputStr: string): Array<string> {
    const relativeDate = inputStr.match(/^(in )?([+-]?\d+)/i);
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

  private defaultSuggestions(inputStr: string): Array<string> {
    const languages = this.plugin.settings.languages;

    const translatedSuggestions = languages.flatMap(l => [
      translate("Today", l),
      translate("Yesterday", l),
      translate("Tomorrow", l)
    ]);

    const uniqueArray = translatedSuggestions.filter(function(item, pos) {
      return translatedSuggestions.indexOf(item) == pos;
    })

    return uniqueArray.filter(item => item.toLowerCase().startsWith(inputStr));
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
