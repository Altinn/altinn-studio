import type { PrefillSource } from 'app-shared/types/PrefillConfig';

export interface PrefillMapping {
  source: PrefillSource;
  key: string;
}
