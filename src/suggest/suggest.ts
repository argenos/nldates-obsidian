import { ISuggestOwner, Scope } from "obsidian";

export const wrapAround = (value: number, size: number): number => {
  return ((value % size) + size) % size;
};

export default class Suggest<T> {
  private owner: ISuggestOwner<T>;
  private values: T[];
  private suggestions: HTMLDivElement[];
  private selectedItem: number;
  private containerEl: HTMLElement;

  constructor(owner: ISuggestOwner<T>, containerEl: HTMLElement, scope: Scope) {
    this.owner = owner;
    this.containerEl = containerEl;

    containerEl.on(
      "click",
      ".suggestion-item",
      this.onSuggestionClick.bind(this)
    );
    containerEl.on(
      "mousemove",
      ".suggestion-item",
      this.onSuggestionMouseover.bind(this)
    );

    scope.register([], "ArrowUp", (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem - 1, true);
        return false;
      }
    });

    scope.register([], "ArrowDown", (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem + 1, true);
        return false;
      }
    });

    const selectItem = (event: KeyboardEvent) => {
      if (!event.isComposing) {
        this.useSelectedItem(event);
        return false;
      }
    };
    scope.register([], "Enter", selectItem);
    scope.register(["Shift"], "Enter", selectItem);
  }

  onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
    event.preventDefault();

    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
    this.useSelectedItem(event);
  }

  onSuggestionMouseover(_event: MouseEvent, el: HTMLDivElement): void {
    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
  }

  setSuggestions(values: T[]): void {
    this.containerEl.empty();
    const suggestionEls: HTMLDivElement[] = [];

    values.forEach((value) => {
      const suggestionEl = this.containerEl.createDiv("suggestion-item");
      this.owner.renderSuggestion(value, suggestionEl);
      suggestionEls.push(suggestionEl);
    });

    this.values = values;
    this.suggestions = suggestionEls;
    this.setSelectedItem(0, false);
  }

  useSelectedItem(event: MouseEvent | KeyboardEvent): void {
    const currentValue = this.values[this.selectedItem];
    if (currentValue) {
      this.owner.selectSuggestion(currentValue, event);
    }
  }

  setSelectedItem(selectedIndex: number, scrollIntoView: boolean): void {
    const normalizedIndex = wrapAround(selectedIndex, this.suggestions.length);
    const prevSelectedSuggestion = this.suggestions[this.selectedItem];
    const selectedSuggestion = this.suggestions[normalizedIndex];

    prevSelectedSuggestion?.removeClass("is-selected");
    selectedSuggestion?.addClass("is-selected");

    this.selectedItem = normalizedIndex;

    if (scrollIntoView) {
      selectedSuggestion.scrollIntoView(false);
    }
  }
}
