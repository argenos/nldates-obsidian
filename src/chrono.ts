import chrono, {Chrono} from "chrono-node";

const supportedLanguages = [
  "en", "ja", "fr", "de", "pt", "nl"
];

export default function getChronos(languages: string[]): Chrono[] {
  const locale = window.moment.locale();
  const isGB = locale === 'en-gb';

  languages = languages.filter(l => supportedLanguages.includes(l));

  const chronos: Chrono[] = [];
  languages.forEach(l => chronos.push(new Chrono(chrono[l].createCasualConfiguration(isGB))));
  return chronos;
}
