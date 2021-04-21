import { App, MarkdownView, Modal, Setting } from "obsidian";
import NaturalLanguageDates from "./main";

export class ParseMomentModal extends Modal {
  activeView: MarkdownView;
  activeEditor: CodeMirror.Editor;
  activeCursor: CodeMirror.Position;
  plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    this.activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (this.activeView) {
      this.activeEditor = this.activeView.sourceMode.cmEditor;
      this.activeCursor = this.activeEditor.getCursor();
    }
  }

  onOpen() {
    let dateInput = "";
    let momentFormat = this.plugin.settings.modalMomentFormat;
    let insertAsLink = this.plugin.settings.modalToggleLink;

    this.contentEl.createEl("form", {}, (formEl) => {
      new Setting(formEl).setName("Date").addText((textEl) => {
        textEl.setPlaceholder("Today");
        textEl.inputEl.autofocus = true;
        textEl.onChange((value) => {
          dateInput = value;
        });
      });
      new Setting(formEl).setName("Date Format").addMomentFormat((momentEl) => {
        momentEl.setPlaceholder("YYYY-MM-DD HH:mm");
        momentEl.setValue(momentFormat);
        momentEl.onChange((value) => {
          momentFormat = value.trim() || "YYYY-MM-DD HH:mm";
        });
      });
      new Setting(formEl).setName("Add as link?").addToggle((toggleEl) => {
        toggleEl
          .setValue(this.plugin.settings.modalToggleLink)
          .onChange((value) => {
            insertAsLink = value;
          });
      });

      formEl.createDiv("modal-button-container", (buttonContainerEl) => {
        buttonContainerEl
          .createEl("button", { attr: { type: "button" }, text: "Never mind" })
          .addEventListener("click", () => this.close());
        buttonContainerEl.createEl("button", {
          attr: { type: "submit" },
          cls: "mod-cta",
          text: "Insert Date",
        });
      });

      formEl.addEventListener("submit", (e) => {
        e.preventDefault();

        let parsedDate = this.plugin.parseDate(dateInput || "today");
        let parsedDateString = parsedDate.moment.isValid()
          ? parsedDate.moment.format(momentFormat)
          : "";

        if (insertAsLink) {
          parsedDateString = `[[${parsedDateString}]]`;
        }

        this.activeEditor.focus();
        this.activeEditor.setCursor(this.activeCursor);
        this.plugin.insertDateString(
          parsedDateString,
          this.activeEditor,
          this.activeCursor
        );
        this.close();
      });
    });
  }
}
