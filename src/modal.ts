import {
  App,
  MarkdownView,
  Modal,
  MomentFormatComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import NaturalLanguageDates from "./main";

export class ParseMomentModal extends Modal {
  parsedDateString = "";
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
    this.contentEl.createEl("form", {}, (formEl) => {
      const inputDateField = new TextComponent(formEl).setPlaceholder("Date");
      const momentFormatField = new MomentFormatComponent(formEl)
        .setDefaultFormat("YYYY-MM-DD HH:mm")
        .setValue(this.plugin.settings.modalMomentFormat)
        .onChange((value) => {
          this.plugin.settings.modalMomentFormat = value
            ? value
            : "YYYY-MM-DD HH:mm";
          this.plugin.saveSettings();
        });

      formEl.appendText("Add as link?");
      const toggleLink = new ToggleComponent(formEl)
        .setValue(this.plugin.settings.modalToggleLink)
        .onChange((value) => {
          this.plugin.settings.modalToggleLink = value;
          this.plugin.saveSettings();
        });
      formEl.createEl("br");

      formEl.createEl("button", {
        cls: "mod-cta",
        text: "Never mind",
        type: "submit",
      });
      formEl.onsubmit = () => {
        let parsedDate = this.plugin.parseDate(inputDateField.getValue());
        this.parsedDateString = parsedDate.moment.format(
          momentFormatField.getValue()
        );

        if (!parsedDate.moment.isValid()) {
          this.parsedDateString = "";
        }
        if (toggleLink.getValue() && this.parsedDateString !== "") {
          this.parsedDateString = `[[${this.parsedDateString}]]`;
        }

        this.activeEditor.focus();
        this.activeEditor.setCursor(this.activeCursor);
        this.plugin.insertDateString(
          this.parsedDateString,
          this.activeEditor,
          this.activeCursor
        );
        this.close();
      };
      inputDateField.inputEl.focus();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
