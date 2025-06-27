import type { MutableRefObject, ReactNode } from 'react';

import { getComponentConfigs } from 'src/layout/components.generated';
import type { DisplayData } from 'src/features/displayData';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { CompIntermediate, CompInternal, CompTypes } from 'src/layout/layout';
import type { AnyComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';

type ComponentConfigs = ReturnType<typeof getComponentConfigs>;

export type CompClassMap = {
  [K in keyof ComponentConfigs]: ComponentConfigs[K]['def'];
};

export type CompClassMapCategories = {
  [K in keyof CompClassMap]: CompClassMap[K]['category'];
};

export type CompDef<T extends CompTypes = CompTypes> = ComponentConfigs[T]['def'];

export interface IComponentProps {
  containerDivRef: MutableRefObject<HTMLDivElement | null>;
}

export interface PropsFromGenericComponent<T extends CompTypes = CompTypes> extends IComponentProps {
  node: LayoutNode<T>;
  overrideItemProps?: Partial<Omit<CompInternal<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
}

export function getNodeDef<T extends CompTypes>(node: LayoutNode<T>): CompClassMap[T] & AnyComponent<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return node.def as any;
}

export function getComponentDef<T extends keyof CompClassMap>(type: T): CompClassMap[T] {
  const configs = getComponentConfigs();
  if (type && type in configs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return configs[type].def as any;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return undefined as any;
}

export function getComponentCapabilities<T extends CompTypes>(type: T): ComponentConfigs[T]['capabilities'] {
  const configs = getComponentConfigs();
  if (type && type in configs) {
    return configs[type].capabilities;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return undefined as any;
}

type TypeFromDef<Def extends CompDef> = Def extends CompDef<infer T> ? T : CompTypes;

export function implementsAnyValidation<Def extends CompDef>(
  def: Def,
): def is Def & (ValidateEmptyField<TypeFromDef<Def>> | ValidateComponent<TypeFromDef<Def>>) {
  return 'useEmptyFieldValidation' in def || 'useComponentValidation' in def;
}

export interface ValidateEmptyField<Type extends CompTypes> {
  useEmptyFieldValidation: (node: LayoutNode<Type>) => ComponentValidation[];
}

export function implementsValidateEmptyField<Def extends CompDef>(
  def: Def,
): def is Def & ValidateEmptyField<TypeFromDef<Def>> {
  return 'useEmptyFieldValidation' in def;
}

export interface ValidateComponent<Type extends CompTypes> {
  useComponentValidation: (node: LayoutNode<Type>) => ComponentValidation[];
}

export function implementsValidateComponent<Def extends CompDef>(
  def: Def,
): def is Def & ValidateComponent<TypeFromDef<Def>> {
  return 'useComponentValidation' in def;
}

export interface SubRouting<Type extends CompTypes> {
  subRouting: (props: { node: LayoutNode<Type> }) => ReactNode;
}

export type ValidationFilterFunction = (
  validation: BaseValidation,
  index: number,
  validations: BaseValidation[],
) => boolean;

export interface ValidationFilter {
  getValidationFilters: (node: LayoutNode, layoutLookups: LayoutLookups) => ValidationFilterFunction[];
}

export type FormDataSelector = (reference: IDataModelReference) => unknown;
export type FormDataRowsSelector = (reference: IDataModelReference) => BaseRow[];

export function implementsDisplayData<Def extends CompDef>(def: Def): def is Def & DisplayData {
  return 'useDisplayData' in def;
}

export function implementsDataModelBindingValidation<T extends CompTypes>(
  def: CompDef<T>,
  _node: LayoutNode<T>,
): def is CompDef<T> & {
  useDataModelBindingValidation: (node: LayoutNode<T>, bindings: CompIntermediate['dataModelBindings']) => string[];
} {
  return 'useDataModelBindingValidation' in def;
}

export function implementsIsDataModelBindingsRequired<T extends CompTypes>(
  def: CompDef<T>,
  _node: LayoutNode<T>,
): def is CompDef<T> & {
  isDataModelBindingsRequired: (node: LayoutNode<T>) => boolean;
} {
  return 'isDataModelBindingsRequired' in def;
}
