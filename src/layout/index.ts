import { createContext } from 'react';

import { ComponentConfigs } from 'src/layout/components';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { ComponentTypes, IGrid } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { IComponentValidations } from 'src/types';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { AnyItem, LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export type ComponentClassMap = {
  [K in keyof typeof ComponentConfigs]: (typeof ComponentConfigs)[K]['def'];
};

export type ComponentClassMapTypes = {
  [K in keyof ComponentClassMap]: ComponentClassMap[K]['type'];
};

// noinspection JSUnusedLocalSymbols
/**
 * This type is only used to make sure all components exist and are correct in the list above. If any component is
 * missing above, this type will give you an error.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _componentsTypeCheck: {
  [Type in ComponentTypes]: { def: LayoutComponent<Type> };
} = {
  ...ComponentConfigs,
};

export interface IComponentProps {
  handleDataChange: (
    value: string | undefined,
    options?: {
      key?: string; // Defaults to simpleBinding
      validate?: boolean; // Defaults to true
    },
  ) => void;
  shouldFocus: boolean;
  label: () => JSX.Element | null;
  legend: () => JSX.Element | null;
  formData: IComponentFormData;
  isValid?: boolean;
  componentValidations?: IComponentValidations;
}

export interface PropsFromGenericComponent<T extends ComponentTypes = ComponentTypes> extends IComponentProps {
  node: LayoutNodeFromType<T>;
  overrideItemProps?: Partial<Omit<AnyItem<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
}

export interface IFormComponentContext {
  grid?: IGrid;
  id?: string;
  baseComponentId?: string;
}

export const FormComponentContext = createContext<IFormComponentContext>({
  grid: undefined,
  id: undefined,
  baseComponentId: undefined,
});

export function getLayoutComponentObject<T extends keyof ComponentClassMap>(type: T): ComponentClassMap[T] {
  if (type && type in ComponentConfigs) {
    return ComponentConfigs[type as keyof typeof ComponentConfigs].def as any;
  }
  return undefined as any;
}

export type DefGetter = typeof getLayoutComponentObject;
