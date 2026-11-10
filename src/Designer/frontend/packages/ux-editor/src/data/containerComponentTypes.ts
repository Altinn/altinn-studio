import { componentCatalog } from '@app/layout-contract';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ContainerComponentType } from '../types/ContainerComponent';

const supportedComponentTypes = new Set<string>(Object.values(ComponentType));

export const containerComponentTypes = Object.entries(componentCatalog)
  .filter(
    ([type, definition]) =>
      supportedComponentTypes.has(type) && 'children' in definition.properties,
  )
  .map(([type]) => type as ContainerComponentType);

export const isContainerComponentType = (type: ComponentType): type is ContainerComponentType =>
  containerComponentTypes.includes(type as ContainerComponentType);
