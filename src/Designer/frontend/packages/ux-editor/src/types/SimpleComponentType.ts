import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ContainerComponentType } from './ContainerComponent';

export type SimpleComponentType = Exclude<ComponentType, ContainerComponentType>;
