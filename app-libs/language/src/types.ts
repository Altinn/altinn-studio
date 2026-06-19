import { en } from '@app/language/texts/en';

export type FixedLanguageList = ReturnType<typeof en>;

/**
 * All valid language keys, derived from the English texts which act as the source of truth.
 * Use this to type-check that a translation key actually exists.
 */
export type ValidLanguageKey = keyof FixedLanguageList;

/**
 * Allows any string while still suggesting the known members of `T` in autocomplete.
 * Mirrors the `LooseAutocomplete` type used in the app frontend so language key arguments
 * keep autocomplete without rejecting arbitrary (e.g. dynamic) keys.
 */
export type LooseAutocomplete<T extends string> = T | (string & {}); // NOSONAR
