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
    let previewEl: HTMLElement;

    let dateInput = "";
    let momentFormat = this.plugin.settings.modalMomentFormat;
    let insertAsLink = this.plugin.settings.modalToggleLink;

    const getDateStr = () => {
      let shouldIncludeAlias = false;
      if (dateInput.endsWith("|")) {
        shouldIncludeAlias = true;
        dateInput = dateInput.slice(0, -1);
      }

      let parsedDate = this.plugin.parseDate(dateInput || "today");
      let parsedDateString = parsedDate.moment.isValid()
        ? parsedDate.moment.format(momentFormat)
        : "";

      if (insertAsLink) {
        parsedDateString = shouldIncludeAlias
          ? `[[${parsedDateString}|${dateInput}]]`
          : `[[${parsedDateString}]]`;
      }

      return parsedDateString;
    };

    this.contentEl.createEl("form", {}, (formEl) => {
      const dateInputEl = new Setting(formEl)
        .setName("Date")
        .setDesc(getDateStr())
        .addText((textEl) => {
          textEl.setPlaceholder("Today");

          textEl.onChange((value) => {
            dateInput = value;
            previewEl.setText(getDateStr());
          });

          window.setTimeout(() => textEl.inputEl.focus(), 10);
        });
      previewEl = dateInputEl.descEl;

      new Setting(formEl).setName("Date Format").addMomentFormat((momentEl) => {
        momentEl.setPlaceholder("YYYY-MM-DD HH:mm");
        momentEl.setValue(momentFormat);
        momentEl.onChange((value) => {
          momentFormat = value.trim() || "YYYY-MM-DD HH:mm";
          previewEl.setText(getDateStr());
        });
      });
      new Setting(formEl).setName("Add as link?").addToggle((toggleEl) => {
        toggleEl
          .setValue(this.plugin.settings.modalToggleLink)
          .onChange((value) => {
            insertAsLink = value;
            previewEl.setText(getDateStr());
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

      formEl.addEventListener("submit", (e: Event) => {
        e.preventDefault();
        this.activeEditor.focus();
        this.activeEditor.setCursor(this.activeCursor);
        this.plugin.insertDateString(
          getDateStr(),
          this.activeEditor,
          this.activeCursor
        );
        this.close();
      });
    });
  }
}
