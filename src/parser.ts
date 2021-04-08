
import chrono from "chrono-node";

var getLastDayOfMonth = function (y: any, m: any) {
  return new Date(y, m, 0).getDate();
};

const custom = chrono.casual.clone();

custom.parsers.push({
  pattern: () => {
    return /\bChristmas\b/i;
  },
  extract: (context: any, match: RegExpMatchArray) => {
    return {
      day: 25,
      month: 12,
    };
  },
});

export interface NLDResult {
  formattedString: string;
  date: Date;
  moment: any;
}


export function getParsedDate(selectedText: string): Date {
    var nextDateMatch = selectedText.match(/next\s([\w]+)/i);
    var lastDayOfMatch = selectedText.match(
      /(last day of|end of)\s*([^\n\r]*)/i
    );
    var midOf = selectedText.match(/mid\s([\w]+)/i);

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return custom.parseDate(`next ${this.settings.weekStart}`, new Date(), {
        forwardDate: true,
      });
    } else if (nextDateMatch && nextDateMatch[1] === "month") {
      var thisMonth = custom.parseDate("this month", new Date(), {
        forwardDate: true,
      });
      return custom.parseDate(selectedText, thisMonth, {
        forwardDate: true,
      });
    } else if (nextDateMatch && nextDateMatch[1] === "year") {
      var thisYear = custom.parseDate("this year", new Date(), {
        forwardDate: true,
      });
      return custom.parseDate(selectedText, thisYear, {
        forwardDate: true,
      });
    } else if (lastDayOfMatch) {
      var tempDate = custom.parse(lastDayOfMatch[2]);
      var year = tempDate[0].start.get("year"),
        month = tempDate[0].start.get("month");
      var lastDay = getLastDayOfMonth(year, month);
      return custom.parseDate(`${year}-${month}-${lastDay}`, new Date(), {
        forwardDate: true,
      });
    } else if (midOf) {
      return custom.parseDate(`${midOf[1]} 15th`, new Date(), {
        forwardDate: true,
      });
    } else {
      return custom.parseDate(selectedText, new Date(), {});
    }
  }
