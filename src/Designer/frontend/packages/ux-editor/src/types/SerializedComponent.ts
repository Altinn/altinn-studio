import type { SerializedComponent as GeneratedSerializedComponent } from '@app/layout-contract/generated/serialized-components.generated';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ContainerComponentType } from './ContainerComponent';
import type { SimpleComponentType } from './SimpleComponentType';
import type {
  ExternalData,
  ExternalFormLayout,
  FormLayoutsResponse,
} from 'app-shared/types/api/FormLayout';

export type KnownSerializedComponent<T extends ComponentType = ComponentType> = Extract<
  GeneratedSerializedComponent,
  { type: `${T}` }
>;

/** Unknown layout properties are retained at the transport boundary for lossless round trips. */
export type SerializedComponent = Extract<
  GeneratedSerializedComponent,
  { type: `${ComponentType}` }
> &
  Record<string, unknown>;
export type SerializedComponentDefaults<T extends ComponentType> = Omit<
  KnownSerializedComponent<T>,
  'id' | 'type' | 'children'
>;
export type SerializedLayoutData = ExternalData<SerializedComponent>;
export type SerializedFormLayout = ExternalFormLayout<SerializedComponent>;
export type SerializedFormLayoutsResponse = FormLayoutsResponse<SerializedComponent>;
export type SerializedSimpleComponent<T extends SimpleComponentType = SimpleComponentType> =
  Extract<SerializedComponent, { type: `${T}` }>;
export type SerializedContainerComponent = Extract<
  SerializedComponent,
  { type: `${ContainerComponentType}` }
>;
