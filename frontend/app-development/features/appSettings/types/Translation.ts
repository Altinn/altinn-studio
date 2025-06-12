import type { AppResource } from 'app-shared/types/AppResource';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type TranslationType = 'none' | keyof AppResource;

export type TranslationFunction = (key: string, params?: KeyValuePairs<string>) => string;
