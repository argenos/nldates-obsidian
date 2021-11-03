import i18n from 'roddeh-i18n';

import en from './en';
import nl from './nl';

export default function t(key: string, lang: string): string {
  const languages = {
    en: i18n.create({ values: en }),
    nl: i18n.create({ values: nl }),
  };
  return languages[lang](key) || languages["en"](key)
}