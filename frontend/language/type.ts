import * as nb from './src/nb.json';

export const allTranslationKeys = Object.keys(nb);
export type TranslationKey = keyof typeof nb;
