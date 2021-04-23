import { App, ISuggestOwner, Scope } from "obsidian";

import Suggest from "./suggest";

export default abstract class CodeMirrorSuggest<T> implements ISuggestOwner<T> {
  protected app: App;
  protected cmEditor: CodeMirror.Editor;
  private scope: Scope;

  private suggestEl: HTMLElement;
  private suggest: Suggest<T>;

  private startPos: CodeMirror.Position;
  private triggerChar: string;

  constructor(app: App, triggerChar: string) {
    this.triggerChar = triggerChar;
    this.app = app;
    this.scope = new Scope();

    this.suggestEl = createDiv("suggestion-container");
    const suggestion = this.suggestEl.createDiv("suggestion");
    this.suggest = new Suggest(this, suggestion, this.scope);

    this.scope.register([], "Escape", this.close.bind(this));
  }

  public update(
    cmEditor: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChange
  ): boolean {
    if (this.cmEditor !== cmEditor) {
      this.suggestEl?.detach();
    }
    this.cmEditor = cmEditor;

    // autosuggest is open
    if (this.suggestEl.parentNode) {
      if (changeObj.removed.contains(this.triggerChar)) {
        this.close();
        return false;
      }

      this.attachAtCursor();
    } else {
      if (
        changeObj.text.length === 1 &&
        changeObj.text[0] === this.triggerChar
      ) {
        this.startPos = changeObj.from;
        this.open();
        this.attachAtCursor();
      }
    }

    return false;
  }

  protected getStartPos(): CodeMirror.Position {
    return this.startPos;
  }

  protected getInputStr(): string {
    // return string from / to cursor
    const cursor = this.cmEditor.getCursor();
    const line = this.cmEditor.getLine(cursor.line);
    return line.substring(this.startPos.ch + 1, cursor.ch);
  }

  private attachAtCursor() {
    const inputStr = this.getInputStr();
    const suggestions = this.getSuggestions(inputStr);
    this.suggest.setSuggestions(suggestions);

    this.cmEditor.addWidget(this.cmEditor.getCursor(), this.suggestEl, true);
  }

  open(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>this.app).keymap.pushScope(this.scope);
  }

  close(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>this.app).keymap.popScope(this.scope);

    this.suggest.setSuggestions([]);
    this.suggestEl.detach();
  }

  abstract getSuggestions(inputStr: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T): void;
}
