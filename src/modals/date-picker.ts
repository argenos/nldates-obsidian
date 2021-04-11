import {
  App,
  ButtonComponent,
  MarkdownView,
  Modal,
  MomentFormatComponent,
  Scope,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from 'obsidian';
import NaturalLanguageDates from 'src/main';

export class ParseMomentModal extends Modal {
  parsedDateString = '';
  activeView: MarkdownView;
  activeEditor: CodeMirror.Editor;
  activeCursor: CodeMirror.Position;
  plugin: NaturalLanguageDates;
  inputDateField: TextComponent;
  momentFormatField: MomentFormatComponent;
  toggleLink: ToggleComponent;
  dateSample: TextAreaComponent;
  scope: Scope;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;

    // Register Enter to close the modal
    this.scope = new Scope();
    this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
      console.log(evt);
      this.insertDate();
      return false;
    });

    // Check if we're viewing a markdown file
    this.activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!this.activeView) return;
    this.activeEditor = this.activeView.sourceMode.cmEditor;
    this.activeCursor = this.activeEditor.getCursor();

    // Add components
    this.contentEl.createDiv('setting-item', (rowEl) => {
      rowEl.createDiv('setting-item-info', (descEl) => {
        descEl.createDiv({
          cls: 'setting-item-name',
          text: 'Date',
        });

        descEl.createDiv({
          cls: 'setting-item-description',
          text: 'Date in natural language',
        });
      });

      rowEl.createDiv('setting-item-control', (ctrlEl) => {
        this.inputDateField = new TextComponent(ctrlEl).setPlaceholder('Date');
      });
    });

    // Moment formatting
    this.contentEl.createDiv('setting-item', (rowEl) => {
      rowEl.createDiv('setting-item-info', (descEl) => {
        descEl.createDiv({
          cls: 'setting-item-name',
          text: 'Format',
        });

        descEl.createDiv({
          cls: 'setting-item-description',
          text: 'Moment format to be used',
        });
      });

      rowEl.createDiv('setting-item-control', (ctrlEl) => {
        this.momentFormatField = new MomentFormatComponent(ctrlEl)
          .setDefaultFormat('YYYY-MM-DD HH:mm')
          .setValue(this.plugin.settings.modalMomentFormat);
      });
    });

    // Link toggle
    this.contentEl.createDiv('setting-item', (rowEl) => {
      rowEl.createDiv('setting-item-info', (descEl) => {
        descEl.createDiv({
          cls: 'setting-item-name',
          text: 'Add as link?',
        });

        descEl.createDiv({
          cls: 'setting-item-description',
          text: 'Whether to add the date as a link',
        });
      });

      rowEl.createDiv('setting-item-control', (ctrlEl) => {
        this.toggleLink = new ToggleComponent(ctrlEl).setValue(
          this.plugin.settings.modalToggleLink,
        );
      });
    });

    // Sample date
    this.contentEl.createDiv('setting-item', (rowEl) => {
      rowEl.createDiv('setting-item-info', (descEl) => {
        descEl.createDiv({
          cls: 'setting-item-name',
          text: 'Preview',
        });

        descEl.createDiv({
          cls: 'setting-item-description',
          text: 'Parsed date as it will be inserted',
        });
      });
      rowEl.createDiv('setting-item-control', (ctrlEl) => {
        this.dateSample = new TextAreaComponent(ctrlEl).setValue(this.parsedDateString);
      });
    });
  }

  onOpen() {
    let { contentEl } = this;

    this.momentFormatField.onChange((value) => {
      this.plugin.settings.modalMomentFormat = value ? value : 'YYYY-MM-DD HH:mm';
      this.plugin.saveSettings();
      this.updateSampleDate();
    });

    this.toggleLink.onChange((value) => {
      this.plugin.settings.modalToggleLink = value;
      this.plugin.saveSettings();
      this.updateSampleDate();
    });

    this.inputDateField.onChange((value) => {
      this.updateSampleDate();
    });

    contentEl.createDiv('modal-button-container', (el) => {
      new ButtonComponent(el).setButtonText('Insert date').onClick(() => {
        this.insertDate();
      });
    });

    this.inputDateField.inputEl.focus();
  }

  insertDate() {
    this.updateSampleDate();
    this.activeEditor.focus();
    this.activeEditor.setCursor(this.activeCursor);
    this.plugin.insertDateString(
      this.parsedDateString,
      this.activeEditor,
      this.activeCursor,
    );
    this.close();
  }

  updateSampleDate() {
    this.getFormattedDate(
      this.inputDateField.getValue(),
      this.momentFormatField.getValue(),
      this.toggleLink.getValue(),
    );
    this.dateSample.setValue(this.parsedDateString);
  }

  getFormattedDate(input: string, format: string, asLink: boolean) {
    let parsedDate = this.plugin.parseDate(input);
    this.parsedDateString = parsedDate.moment.format(format);
    if (!parsedDate.moment.isValid()) this.parsedDateString = '';
    if (asLink && this.parsedDateString !== '')
      this.parsedDateString = `[[${this.parsedDateString}]]`;
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
