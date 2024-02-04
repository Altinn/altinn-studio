import type { ExternalComponent } from 'app-shared/types/api';
import type { SimpleComponentType } from './SimpleComponentType';

export type ExternalSimpleComponent<T extends SimpleComponentType = SimpleComponentType> =
  ExternalComponent<T>;
