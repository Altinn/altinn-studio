import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type TranslationFunction = (key: string, params?: KeyValuePairs<string>) => string;
