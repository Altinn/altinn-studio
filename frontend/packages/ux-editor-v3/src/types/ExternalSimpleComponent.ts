import type { ExternalComponentV3 } from 'app-shared/types/api';
import type { SimpleComponentType } from './SimpleComponentType';

export type ExternalSimpleComponent<T extends SimpleComponentType = SimpleComponentType> =
  ExternalComponentV3<T>;
