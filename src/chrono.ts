import chrono, { Chrono, Parser } from "chrono-node";
import { ORDINAL_NUMBER_PATTERN, parseOrdinalNumberPattern } from "./utils";

function getOrdinalDateParser() {
  return ({
    pattern: () => new RegExp(ORDINAL_NUMBER_PATTERN),
    extract: (_context, match) => {
      return {
        day: parseOrdinalNumberPattern(match[0]),
        month: window.moment().month(),
      };
    },
  } as Parser);
}


export default function getChronos(languages: string[]): Chrono[] {
  const locale = window.moment.locale();
  const isGB = locale === 'en-gb';

  const chronos: Chrono[] = [];
  const ordinalDateParser = getOrdinalDateParser();
  languages.forEach(l => {
    const c = new Chrono(chrono[l].createCasualConfiguration(isGB));
    c.parsers.push(ordinalDateParser);
    chronos.push(c)
  });
  return chronos;
}
