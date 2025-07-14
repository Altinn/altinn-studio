import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';

export type TestCase = {
  description: string;
  searchText: string;
  expected: KeyValuePairs<IToolbarElement[]>;
};
