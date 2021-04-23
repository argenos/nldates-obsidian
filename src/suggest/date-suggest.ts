import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";

const TRIGGER_CHAR = "@";

interface IDateCompletion {
  label: string;
}

export default class DateSuggest extends CodeMirrorSuggest<IDateCompletion> {
  plugin: NaturalLanguageDates;
  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app, TRIGGER_CHAR);
    this.plugin = plugin;
  }

  getSuggestions(inputStr: string): IDateCompletion[] {
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
      inputStr.match(/^in ([+-]?\d+)/i) || inputStr.match(/^([+-]\d+)/i);
    if (relativeDate) {
      const daysAway = relativeDate[1];
      return [
        { label: `in ${daysAway} days` },
        { label: `in ${daysAway} weeks` },
        { label: `in ${daysAway} months` },
        { label: `${daysAway} days ago` },
        { label: `${daysAway} weeks ago` },
        { label: `${daysAway} months ago` },
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

  selectSuggestion(suggestion: IDateCompletion): void {
    const head = this.getStartPos();
    const anchor = this.cmEditor.getCursor();

    let replacementStr = "";
    if (this.plugin.settings.modalToggleLink) {
      replacementStr = `[[${
        this.plugin.parseDate(suggestion.label).formattedString
      }|${suggestion.label}]]`;
    } else {
      replacementStr = this.plugin.parseDate(suggestion.label).formattedString;
    }

    this.cmEditor.replaceRange(replacementStr, head, anchor);
    this.close();
  }
}
