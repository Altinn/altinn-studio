export const useAppLanguages = () => window.AltinnAppGlobalData.availableLanguages.map((lang) => lang.language);

export const getAppLanguages = () => window.AltinnAppGlobalData.availableLanguages;
