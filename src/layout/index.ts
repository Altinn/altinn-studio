import { createContext } from 'react';

import { ComponentConfigs } from 'src/layout/components';
import type { IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { ComponentRendersLabel, ComponentTypes, IGrid } from 'src/layout/layout';
import type { AnyComponent, LayoutComponent } from 'src/layout/LayoutComponent';
import type { IOptions, IUiConfig } from 'src/types';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { AnyItem, LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ISchemaValidationError } from 'src/utils/validation/schemaValidation';
import type { IComponentValidations, IValidationContext, IValidationObject } from 'src/utils/validation/types';

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

export function shouldComponentRenderLabel<T extends ComponentTypes>(type: T): ComponentRendersLabel<T> {
  return ComponentConfigs[type].rendersWithLabel;
}

export type DefGetter = typeof getLayoutComponentObject;

export function implementsAnyValidation<Type extends ComponentTypes>(component: AnyComponent<Type>): boolean {
  return (
    'runEmptyFieldValidation' in component ||
    'runComponentValidation' in component ||
    'runSchemaValidation' in component
  );
}

export interface EmptyFieldValidation {
  runEmptyFieldValidation: (
    node: LayoutNode,
    validationContext: IValidationContext,
    overrideFormData?: IFormData,
  ) => IValidationObject[];
}

export function implementsEmptyFieldValidation<Type extends ComponentTypes>(
  component: AnyComponent<Type>,
): component is typeof component & EmptyFieldValidation {
  return 'runEmptyFieldValidation' in component;
}

export interface ComponentValidation {
  runComponentValidation: (
    node: LayoutNode,
    validationContext: IValidationContext,
    overrideFormData?: IFormData,
  ) => IValidationObject[];
}

export function implementsComponentValidation<Type extends ComponentTypes>(
  component: AnyComponent<Type>,
): component is typeof component & ComponentValidation {
  return 'runComponentValidation' in component;
}

export interface SchemaValidation {
  runSchemaValidation: (node: LayoutNode, schemaValidations: ISchemaValidationError[]) => IValidationObject[];
}

export function implementsSchemaValidation<Type extends ComponentTypes>(
  component: AnyComponent<Type>,
): component is typeof component & SchemaValidation {
  return 'runSchemaValidation' in component;
}

export interface GroupValidation {
  runGroupValidations: (
    node: LayoutNode,
    validationContext: IValidationContext,
    onlyInRowIndex?: number,
  ) => IValidationObject[];
}

export function implementsGroupValidation<Type extends ComponentTypes>(
  component: AnyComponent<Type>,
): component is typeof component & GroupValidation {
  return 'runGroupValidations' in component;
}

export interface DisplayDataProps {
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  uiConfig: IUiConfig;
  langTools: IUseLanguage;
}

export interface DisplayData<Type extends ComponentTypes> {
  getDisplayData(node: LayoutNodeFromType<Type>, displayDataProps: DisplayDataProps): string;
  useDisplayData(node: LayoutNodeFromType<Type>): string;
}

export function implementsDisplayData<Type extends ComponentTypes>(
  component: AnyComponent<Type>,
): component is typeof component & DisplayData<Type> {
  return 'getDisplayData' in component && 'useDisplayData' in component;
}
