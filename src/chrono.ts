import chrono, {Chrono} from "chrono-node";


export default function getChronos(languages: string[]): Chrono[] {
  const locale = window.moment.locale();
  const isGB = locale === 'en-gb';

  const chronos: Chrono[] = [];
  languages.forEach(l => chronos.push(new Chrono(chrono[l].createCasualConfiguration(isGB))));
  return chronos;
}
