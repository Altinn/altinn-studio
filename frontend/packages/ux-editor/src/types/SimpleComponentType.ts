import type { ComponentType } from 'app-shared/types/ComponentType';

export type SimpleComponentType = Exclude<ComponentType, ComponentType.Group>;
