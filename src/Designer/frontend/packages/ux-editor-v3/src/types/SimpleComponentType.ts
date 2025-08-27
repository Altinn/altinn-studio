import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { ContainerComponentType } from './ContainerComponent';

export type SimpleComponentType = Exclude<ComponentTypeV3, ContainerComponentType>;
