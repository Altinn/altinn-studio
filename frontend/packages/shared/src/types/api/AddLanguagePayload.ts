import type { TextResourceEntry } from 'app-shared/types/TextResourceEntry';

export interface AddLanguagePayload {
  language: string;
  resources: TextResourceEntry[];
}
