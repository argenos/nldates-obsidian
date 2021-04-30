import { App, MarkdownView, Modal, Setting } from "obsidian";
import NaturalLanguageDates from "../main";

export default class DatePickerModal extends Modal {
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

  onOpen(): void {
    let previewEl: HTMLElement;

    let dateInput = "";
    let momentFormat = this.plugin.settings.modalMomentFormat;
    let insertAsLink = this.plugin.settings.modalToggleLink;

    const getDateStr = () => {
      let cleanDateInput = dateInput;
      let shouldIncludeAlias = false;

      if (dateInput.endsWith("|")) {
        shouldIncludeAlias = true;
        cleanDateInput = dateInput.slice(0, -1);
      }

      const parsedDate = this.plugin.parseDate(cleanDateInput || "today");
      let parsedDateString = parsedDate.moment.isValid()
        ? parsedDate.moment.format(momentFormat)
        : "";

      if (insertAsLink) {
        parsedDateString = shouldIncludeAlias
          ? `[[${parsedDateString}|${cleanDateInput}]]`
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

      new Setting(formEl)
        .setName("Date Format")
        .setDesc("Moment format to be used")
        .addMomentFormat((momentEl) => {
          momentEl.setPlaceholder("YYYY-MM-DD HH:mm");
          momentEl.setValue(momentFormat);
          momentEl.onChange((value) => {
            momentFormat = value.trim() || "YYYY-MM-DD HH:mm";
            this.plugin.settings.modalMomentFormat = momentFormat;
            this.plugin.saveSettings();

            previewEl.setText(getDateStr());
          });
        });
      new Setting(formEl).setName("Add as link?").addToggle((toggleEl) => {
        toggleEl
          .setValue(this.plugin.settings.modalToggleLink)
          .onChange((value) => {
            insertAsLink = value;
            this.plugin.settings.modalToggleLink = insertAsLink;
            this.plugin.saveSettings();

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
        this.close();
        this.plugin.insertDateString(
          getDateStr(),
          this.activeEditor,
          this.activeCursor
        );
      });
    });
  }
}
