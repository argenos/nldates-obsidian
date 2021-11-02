const i18n = {
  en: {
    Today: "Today",
    Yesterday: "Yesterday",
    Tomorrow: "Tomorrow",
  },
  nl: {
    Today: "Vandaag",
    Tomorrow: "Morgen",
  },
}

export const translate = (key, language) => {
  const result = i18n[language][key];
  if (result)
    return result
  const fallback = i18n['en'][key];
  if (fallback)
    return fallback
  console.error(`Translation for ${key} was not found`)
  return undefined
}
