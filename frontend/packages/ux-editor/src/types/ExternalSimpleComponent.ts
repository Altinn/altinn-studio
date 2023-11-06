import { ExternalComponent } from 'app-shared/types/api';
import { SimpleComponentType } from './SimpleComponentType';

export type ExternalSimpleComponent<T extends SimpleComponentType = SimpleComponentType> =
  ExternalComponent<T>;
