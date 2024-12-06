import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ContainerComponentType } from './ContainerComponent';

export type SimpleComponentType = Exclude<ComponentType, ContainerComponentType>;
