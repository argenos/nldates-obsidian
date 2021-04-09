import { App, SuggestModal } from "obsidian";
import { NLDResult } from "src/parser";
import NaturalLanguageDates from "src/main";

interface DateNavigationItem {
  file: any;
  // result: NLDResult;
  date: string;
}


export class NLDNavigator extends SuggestModal<DateNavigationItem> {
// class NLDNavigator<TFile> extends FuzzySuggestModal<TFile> {
    plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    // this.activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    // if (!this.activeView) return;
    // this.activeEditor = this.activeView.sourceMode.cmEditor;
    // this.activeCursor = this.activeEditor.getCursor();
  }


  // getItems(): TFile[]{
  //     let files = this.app.vault.getFiles();
	// 		// const dateFiles = files.filter(e => e.name === dateValue //hat-tip 🎩 to @MrJackPhil for this little workflow 
	// 		// 	|| e.path === dateValue
	// 		// 	|| e.basename === dateValue
	// 		// );
  //   return files;
  // }

    // getItemText(item: T): string {
    // }

  getDateSuggestions(query:string, parsedResult: NLDResult) {
    let start = window.moment(parsedResult.moment)
    let dateArray = [];
    let end;
    if (query.includes("week")){
      end = window.moment(start).endOf("week")
    } else if (query.includes("month")) {
      end = window.moment(start).endOf("month")
    } else {
      // Add one day just so we enter the while loop
      end = window.moment(start).add(1, "day");
    }

    console.log(start)
    console.log(end)
      
    while(!start.isSame(end, "day")) {
      dateArray.push(start.format("YYYY-MM-DD"));
      start.add(1, "day");
    }

    return dateArray;
  }

  getDailyNoteFile(dateString:string) {
    let files = this.app.vault.getFiles();
    const dateFile = files.filter(e => e.name === dateString //hat-tip 🎩 to @MrJackPhil for this little workflow 
      || e.path === dateString
      || e.basename === dateString
    )[0];
    return dateFile;
  }

  getSuggestions(query: string) : DateNavigationItem[]{
    let nldates = this.plugin;
    let parsedResult :NLDResult = nldates.parseDate(query);
    let suggestions = [];

    if (parsedResult.moment.isValid()) {
      let dateValue = parsedResult.formattedString;
      console.log(dateValue);
      let dates = this.getDateSuggestions(query, parsedResult);
      console.log(dates)
      for (let date of dates) {
        let dateFile = this.getDailyNoteFile(dateValue);
        suggestions.push({date: date, file: dateFile})
      }
			// console.log("File found:" + dateFile);
      return suggestions;
    } else {
      return [];
    }
  }
  
  renderSuggestion(value: DateNavigationItem, el: HTMLElement) {
    el.appendText(value.date);

    if (!value.file){
      el.setText(value.date)
      el.createEl('kbd', {cls: 'suggestion-hotkey', text: "Enter to create"});
    }

  }

  onChooseSuggestion(item: DateNavigationItem, evt: MouseEvent | KeyboardEvent) {
    console.log(item)
    console.log(evt);
  }
}