# nldates-obsidian

Create date links using natural language processing using [chrono](https://github.com/wanasit/chrono) and some custom parsing.
To create a date link, select the text you want to change (e.g. `today`), and use the `NLP date` command. You can use the shortcut (default `CTRL + Y`) or the command palette (`Ctrl + P`).
For single-word dates (e.g. today, tomorrow, friday, etc.), it's possible to use the command without selecting the word first.

You can try with any of the standard dates, i.e. today, tomorrow, in 3 weeks, in 5 months, etc.
The only behaviours I changed were the following:

| Write | Date |
| ----- | ---- |
|   next week    | next Monday      |
|   next [month]    |  1st of next month     |
|   mid [month]   | 15th of the month      |
|   end of [month]    |  last day of the month     |

If a date is not recognized, the link won't be created.

## Demo

<img src="https://user-images.githubusercontent.com/5426039/89716767-1d768700-d9b0-11ea-99cf-b3bb6846a872.gif" alt="demo" style="zoom:60%;" />

## Installing

Unzip the [latest release](https://github.com/argenos/nldates-obsidian/releases/latest) into your `<vault>/.obsidian/plugins/` folder.
