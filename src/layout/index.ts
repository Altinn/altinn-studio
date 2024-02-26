import type { MutableRefObject } from 'react';

import { ComponentConfigs } from 'src/layout/components.generated';
import type { IAttachments } from 'src/features/attachments';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { BaseValidation, ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { CompInternal, CompRendersLabel, CompTypes } from 'src/layout/layout';
import type { AnyComponent, LayoutComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  containerDivRef: MutableRefObject<HTMLDivElement | null>;
  isValid?: boolean;
}

export interface PropsFromGenericComponent<T extends CompTypes = CompTypes> extends IComponentProps {
  node: LayoutNode<T>;
  overrideItemProps?: Partial<Omit<CompInternal<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
}

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
  return 'runEmptyFieldValidation' in component || 'runComponentValidation' in component;
}

export interface ValidateEmptyField {
  runEmptyFieldValidation: (node: LayoutNode, validationContext: ValidationDataSources) => ComponentValidation[];
}

export function implementsValidateEmptyField<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & ValidateEmptyField {
  return 'runEmptyFieldValidation' in component;
}

export interface ValidateComponent {
  runComponentValidation: (node: LayoutNode, validationContext: ValidationDataSources) => ComponentValidation[];
}

export function implementsValidateComponent<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & ValidateComponent {
  return 'runComponentValidation' in component;
}

export type ValidationFilterFunction = (
  validation: BaseValidation,
  index: number,
  validations: BaseValidation[],
) => boolean;

export interface ValidationFilter {
  getValidationFilter: (node: LayoutNode) => ValidationFilterFunction | null;
}

export function implementsValidationFilter<Type extends CompTypes>(
  component: AnyComponent<Type>,
): component is typeof component & ValidationFilter {
  return 'getValidationFilter' in component;
}

export interface DisplayDataProps {
  attachments: IAttachments;
  options: AllOptionsMap;
  langTools: IUseLanguage;
  currentLanguage: string;
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
