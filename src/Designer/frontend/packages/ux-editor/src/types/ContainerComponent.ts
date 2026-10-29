import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { SerializedComponent } from '@app/layout-contract/generated/serialized-components.generated';

type SerializedChildContainerType = Extract<SerializedComponent, { children: string[] }>['type'];

export type ContainerComponentType = {
  [Type in ComponentType]: `${Type}` extends SerializedChildContainerType ? Type : never;
}[ComponentType];
