# Natural language dates in Obsidian

Create date links using natural language processing using [chrono](https://github.com/wanasit/chrono) and some custom parsing.
To create a date link, select the text you want to change (e.g. `today`), and use the `NLP date` command. You can use the shortcut (default `CTRL + Y`) or the command palette (`Ctrl + P`).
For single-word dates (e.g. today, tomorrow, friday, etc.), it's possible to use the command without selecting the word first. It's also possible to use dates like Nov9, 25Dec to use this trick.

You can try with any of the standard dates, i.e. today, tomorrow, in 3 weeks, in 5 months, etc.
The only behaviours I changed were the following:

| Write | Date |
| ----- | ---- |
|   next week    | next Monday      |
|   next [month]    |  1st of next month     |
|   mid [month]   | 15th of the month      |
|   end of [month]    |  last day of the month     |

If a date is not recognized, the link won't be created.


**New in v0.4.0**: It's now possible to use the Obsidian URI to open daily notes using natural language by using the nldates action `obsidian://nldates?day=<date here>`

## Commands and hotkeys

Starting on v0.3.2, in addition to the hotkey (default `CTRL/CMD + Y`) to parse the selected date, the following commands are also available:

#### Natural Language Dates: Date Picker
Opens the date picker menu
<br>
<img src="https://user-images.githubusercontent.com/5426039/99131292-0d0b2380-2613-11eb-8469-20d510fa2074.png" alt="Three commands to insert the current date, current time and a combination of both." style="zoom:75%;" />

#### Natural Language Dates: Insert current date
Inserts the current date, using the format specified in the settings menu. (default output `YYYY-MM-DD`)

#### Natural Language Dates: Insert current time
Inserts the current time, using the format specified in the settings menu. (default output `HH:mm`)

#### Natural Language Dates: Insert current date and time
Inserts the current date, using the format specified in the settings menu. (default output `YYYY-MM-DD HH:mm`)

#### Natural Language Dates: Parse natural language date
Parses the selected text as a natural language date. Replaces selected text with an obsidian link to the parsed date in the format specified in the settings menu (default `[[YYYY-MM-DD]]`).

#### Natural Language Dates: Parse natural language time
Parses the selected text as a natural language time. Replaces selected text with the parsed time stamp in the format specified in the settings menu (default `HH:mm`).

You can try with any of the standard times, i.e. now, in 15min, in 1h, 5min ago, etc.

#### Natural Language Dates: Parse natural language date (as link)
Parses the selected text as a natural language date. Replaces selected text with a standard markdown link to the parsed date in the format specified in the settings menu (default `[selected text](YYYY-MM-DD)`).

#### Natural Language Dates: Parse natural language date (as plain text)
Parses the selected text as a natural language date. Replaces selected text with a plain text parsed date in the format specified in the settings menu (default `YYYY-MM-DD`).


__You can of course add hotkeys to each of these commands.__


## Demo

<img src="https://user-images.githubusercontent.com/5426039/89716767-1d768700-d9b0-11ea-99cf-b3bb6846a872.gif" alt="demo" style="zoom:60%;" />

**Note**:
The parser will replace all the selected text, meaning that in a sentence you should only select the dates to be parsed and not the full sentence.  
In the example sentence `Do this thing by tomorrow`, only the word `tomorrow` should be selected. Alternatively, keep in mind that you can place your cursor **on** or **next to** the word tomorrow, and it will be replaced:

<img src="https://user-images.githubusercontent.com/5426039/98358876-a640a580-2027-11eb-8efc-015362a94321.gif" alt="Supported selections" style="zoom:80%;" />

## How to install

In Obsidian go to `Settings > Third-party plugins > Community Plugins > Browse` and search for `Natural Language Dates`.

### Manual installation

Unzip the [latest release](https://github.com/argenos/nldates-obsidian/releases/latest) into your `<vault>/.obsidian/plugins/` folder.

## For Developers

You can use the method `parsedDate` to parse dates. It takes a string as an argument, and returns a `NLDResult`:

```typescript
interface NLDResult {
  formattedString: string;
  date: Date;
  moment: any; // This is actually a Moment object
}
```

- The `formattedString` will return the date formatted according to the settings of `nldates` and without the square brackets.
- The `date` object is what is returned by the `parseDate` method of the custom parser (using the [chrono](https://github.com/wanasit/chrono) package).
- The `Moment` object is created with the `date` object, [cloning it](https://momentjs.com/docs/#/parsing/date/).
If you need, you can further [manipulate](https://momentjs.com/docs/#/manipulating/) or [format](https://momentjs.com/docs/#/displaying/) the moment object, for example:

    ```typescript
    let nldatesPlugin = obsidianApp.plugins.getPlugin('nldates-obsidian');
    let parsedResult = nldatesPlugin.parseDate("next year");
    console.log(parsedResult.moment.format("YYYY")); //This should return 20201
    console.log(parsedResult.moment.fromNow()) // "In two months"
    parsedResult = nldatesPlugin.parseDate("today at 21:00");
    console.log(parsedResult.moment.add(1, "hour")); // This would change the Moment to 22:00

    ```

    Note that if you manipulate the `parsedResult.moment`, the `date` and `formattedString` won't be updated. If you don't want to alter the `parsedResult.moment`, you should clone it. Read more about that [here](https://momentjs.com/docs/#/parsing/date/).
