import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";

interface IDateCompletion {
  label: string;
}

export default class DateSuggest extends CodeMirrorSuggest<IDateCompletion> {
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

  getSuggestions(inputStr: string): IDateCompletion[] {
    // handle no matches
    const suggestions = this.getDateSuggestions(inputStr);
    if (suggestions.length) {
      return suggestions;
    } else {
      return [{ label: inputStr }];
    }
  }

  getDateSuggestions(inputStr: string): IDateCompletion[] {
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

    const head = this.getStartPos();
    const anchor = this.cmEditor.getCursor();

    let dateStr = this.plugin.parseDate(suggestion.label).formattedString;
    if (this.plugin.settings.autosuggestToggleLink) {
      if (includeAlias) {
        dateStr = `[[${dateStr}|${suggestion.label}]]`;
      } else {
        dateStr = `[[${dateStr}]]`;
      }
    }

    this.cmEditor.replaceRange(dateStr, head, anchor);
    this.close();
  }
}
