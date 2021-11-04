import {Chrono, ParsedResult, ParsingOption} from "chrono-node";
import type { Moment } from "moment";
import getChronos from "./chrono";

export interface NLDResult {
  formattedString: string;
  date: Date;
  moment: Moment;
}

const getLastDayOfMonth = function (y: number, m: number) {
  return new Date(y, m, 0).getDate();
};

export default class NLDParser {
  chronos: Chrono[];

  constructor(languages: string[]) {
    this.chronos = getChronos(languages);
  }

  getParsedDateResult(text: string, referenceDate?: Date, option?: ParsingOption): Date {
    let result: Date;
    this.chronos.forEach(c => {
      const parsedDate = c.parseDate(text, referenceDate, option);
      if (parsedDate) {
        result = parsedDate;
        return;
      }
    });
    return result;
  }

  getParsedResult(text: string): ParsedResult[] {
    let result: ParsedResult[];
    this.chronos.forEach(c => {
      const parsedResult = c.parse(text);
      if (parsedResult) {
        result = parsedResult;
        return;
      }
    });
    return result;
  }

  getParsedDate(selectedText: string, weekStart: string): Date {
    const nextDateMatch = selectedText.match(/next\s([\w]+)/i);
    const lastDayOfMatch = selectedText.match(
      /(last day of|end of)\s*([^\n\r]*)/i
    );
    const midOf = selectedText.match(/mid\s([\w]+)/i);

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return this.getParsedDateResult(`next ${weekStart}`, new Date(),{
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "month") {
      const thisMonth = this.getParsedDateResult("this month", new Date(),{
        forwardDate: true,
      });
      return this.getParsedDateResult(selectedText, thisMonth, {
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "year") {
      const thisYear = this.getParsedDateResult("this year", new Date(), {
        forwardDate: true,
      });
      return this.getParsedDateResult(selectedText, thisYear, {
        forwardDate: true,
      });
    }

    if (lastDayOfMatch) {
      const tempDate = this.getParsedResult(lastDayOfMatch[2]);
      const year = tempDate[0].start.get("year");
      const month = tempDate[0].start.get("month");
      const lastDay = getLastDayOfMonth(year, month);

      return this.getParsedDateResult(`${year}-${month}-${lastDay}`, new Date(), {
        forwardDate: true,
      });
    }

    if (midOf) {
      return this.getParsedDateResult(`${midOf[1]} 15th`, new Date(), {
        forwardDate: true,
      });
    }

    return this.getParsedDateResult(selectedText);
  }
}
