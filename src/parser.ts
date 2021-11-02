import chrono, { Chrono } from "chrono-node";
import type { Moment } from "moment";

export interface NLDResult {
  formattedString: string;
  date: Date;
  moment: Moment;
}

const getLastDayOfMonth = function (y: number, m: number) {
  return new Date(y, m, 0).getDate();
};

function getLocalizedChrono(language: string): Chrono {
  const locale = window.moment.locale();
  const gb = locale === "en-gb";

  switch (language) {
    case "en":
      return new Chrono(chrono.en.createCasualConfiguration(gb));
    case "ja":
      return new Chrono(chrono.ja.createCasualConfiguration());
    case "fr":
      return new Chrono(chrono.fr.createCasualConfiguration());
    case "de":
      return new Chrono(chrono.de.createCasualConfiguration());
    case "pt":
      return new Chrono(chrono.pt.createCasualConfiguration());
    case "nl":
      return new Chrono(chrono.nl.createCasualConfiguration());
    default:
      return new Chrono(chrono.en.createCasualConfiguration(gb));
  }
}

function getConfiguredChrono(language: string): Chrono {
  const localizedChrono = getLocalizedChrono(language);
  return localizedChrono;
}

export default class NLDParser {
  chrono: Chrono;

  constructor(language: string) {
    this.chrono = getConfiguredChrono(language);
  }

  getParsedDate(selectedText: string, weekStart: string): Date {
    const parser = this.chrono;

    const nextDateMatch = selectedText.match(/next\s([\w]+)/i);
    const lastDayOfMatch = selectedText.match(
      /(last day of|end of)\s*([^\n\r]*)/i
    );
    const midOf = selectedText.match(/mid\s([\w]+)/i);

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return parser.parseDate(`next ${weekStart}`, new Date(), {
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "month") {
      const thisMonth = parser.parseDate("this month", new Date(), {
        forwardDate: true,
      });
      return parser.parseDate(selectedText, thisMonth, {
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "year") {
      const thisYear = parser.parseDate("this year", new Date(), {
        forwardDate: true,
      });
      return parser.parseDate(selectedText, thisYear, {
        forwardDate: true,
      });
    }

    if (lastDayOfMatch) {
      const tempDate = parser.parse(lastDayOfMatch[2]);
      const year = tempDate[0].start.get("year");
      const month = tempDate[0].start.get("month");
      const lastDay = getLastDayOfMonth(year, month);

      return parser.parseDate(`${year}-${month}-${lastDay}`, new Date(), {
        forwardDate: true,
      });
    }

    if (midOf) {
      return parser.parseDate(`${midOf[1]} 15th`, new Date(), {
        forwardDate: true,
      });
    }

    return parser.parseDate(selectedText, new Date());
  }
}
