import { createContext } from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { type IUseLanguage, staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { ComponentConfigs } from 'src/layout/components.generated';
import type { IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IGrid } from 'src/layout/common.generated';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { CompInternal, CompRendersLabel, CompTypes } from 'src/layout/layout';
import type { AnyComponent, LayoutComponent } from 'src/layout/LayoutComponent';
import type { IOptions, IRuntimeState } from 'src/types';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ISchemaValidationError } from 'src/utils/validation/schemaValidation';
import type {
  IComponentValidations,
  IValidationContext,
  IValidationObject,
  ValidationContextGenerator,
} from 'src/utils/validation/types';

export type CompClassMap = {
  [K in keyof typeof ComponentConfigs]: (typeof ComponentConfigs)[K]['def'];
};

export type CompClassMapTypes = {
  [K in keyof CompClassMap]: CompClassMap[K]['type'];
};

// noinspection JSUnusedLocalSymbols
/**
 * This type is only used to make sure all components exist and are correct in the list above. If any component is
 * missing above, this type will give you an error.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _componentsTypeCheck: {
  [Type in CompTypes]: { def: LayoutComponent<Type> };
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

export interface PropsFromGenericComponent<T extends CompTypes = CompTypes> extends IComponentProps {
  node: LayoutNode<T>;
  overrideItemProps?: Partial<Omit<CompInternal<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
}

export interface IFormComponentContext {
  grid?: IGrid;
  id?: string;
  baseComponentId?: string;
  node?: LayoutNode;
}

export const FormComponentContext = createContext<IFormComponentContext>({
  grid: undefined,
  id: undefined,
  baseComponentId: undefined,
  node: undefined,
});

export function getLayoutComponentObject<T extends keyof CompClassMap>(type: T): CompClassMap[T] {
  if (type && type in ComponentConfigs) {
    return ComponentConfigs[type as keyof typeof ComponentConfigs].def as any;
  }
  return undefined as any;
}

export function shouldComponentRenderLabel<T extends CompTypes>(type: T): CompRendersLabel<T> {
  return ComponentConfigs[type].rendersWithLabel;
}

export type DefGetter = typeof getLayoutComponentObject;

export function implementsAnyValidation<Type extends CompTypes>(component: AnyComponent<Type>): boolean {
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

export function implementsEmptyFieldValidation<Type extends CompTypes>(
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

export function implementsComponentValidation<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & ComponentValidation {
  return 'runComponentValidation' in component;
}

export interface SchemaValidation {
  runSchemaValidation: (node: LayoutNode, schemaValidations: ISchemaValidationError[]) => IValidationObject[];
}

export function implementsSchemaValidation<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & SchemaValidation {
  return 'runSchemaValidation' in component;
}

export interface GroupValidation {
  runGroupValidations: (
    node: LayoutNode,
    validationCtxGenerator: ValidationContextGenerator,
    onlyInRowIndex?: number,
  ) => IValidationObject[];
}

export function implementsGroupValidation<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & GroupValidation {
  return 'runGroupValidations' in component;
}

export interface DisplayDataProps {
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  langTools: IUseLanguage;
}

export interface DisplayData<Type extends CompTypes> {
  getDisplayData(node: LayoutNode<Type>, displayDataProps: DisplayDataProps): string;
  useDisplayData(node: LayoutNode<Type>): string;
}

export function implementsDisplayData<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & DisplayData<Type> {
  return 'getDisplayData' in component && 'useDisplayData' in component;
}

function getDisplayDataPropsFromState(state: IRuntimeState): DisplayDataProps {
  return {
    formData: state.formData.formData,
    attachments: state.attachments.attachments,
    options: state.optionState.options,
    langTools: staticUseLanguageFromState(state),
  };
}

export function useDisplayDataProps(): DisplayDataProps {
  return useAppSelector(getDisplayDataPropsFromState);
}
