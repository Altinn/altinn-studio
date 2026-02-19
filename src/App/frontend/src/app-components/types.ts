export type TranslationKey = string & { __brand: 'TranslationKey' };

export type LooseAutocomplete<T extends string> = T | (string & {}); // NOSONAR
