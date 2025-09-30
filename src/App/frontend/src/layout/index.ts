import type { ReactNode, RefObject } from 'react';

import { getComponentConfigs } from 'src/layout/components.generated';
import type { DisplayData } from 'src/features/displayData';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { CompIntermediate, CompInternal, CompTypes } from 'src/layout/layout';
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
  containerDivRef: RefObject<HTMLDivElement | null>;
}

export interface PropsFromGenericComponent<T extends CompTypes = CompTypes> extends IComponentProps {
  baseComponentId: string;
  overrideItemProps?: Partial<Omit<CompInternal<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
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

export function implementsAnyValidation<Def extends CompDef>(
  def: Def,
): def is Def & (ValidateEmptyField | ValidateComponent) {
  return 'useEmptyFieldValidation' in def || 'useComponentValidation' in def;
}

export interface ValidateEmptyField {
  useEmptyFieldValidation: (baseComponentId: string) => ComponentValidation[];
}

export function implementsValidateEmptyField<Def extends CompDef>(def: Def): def is Def & ValidateEmptyField {
  return 'useEmptyFieldValidation' in def;
}

export interface ValidateComponent {
  useComponentValidation: (baseComponentId: string) => ComponentValidation[];
}

export function implementsValidateComponent<Def extends CompDef>(def: Def): def is Def & ValidateComponent {
  return 'useComponentValidation' in def;
}

export interface SubRouting {
  subRouting: (props: { baseComponentId: string }) => ReactNode;
}

export type ValidationFilterFunction = (
  validation: BaseValidation,
  index: number,
  validations: BaseValidation[],
) => boolean;

export interface ValidationFilter {
  getValidationFilters: (baseComponentId: string, layoutLookups: LayoutLookups) => ValidationFilterFunction[];
}

export type FormDataSelector = (reference: IDataModelReference) => unknown;
export type FormDataRowsSelector = (reference: IDataModelReference) => BaseRow[];

export function implementsDisplayData<Def extends CompDef>(def: Def): def is Def & DisplayData {
  return 'useDisplayData' in def;
}

export function implementsDataModelBindingValidation<T extends CompTypes>(
  def: CompDef<T>,
  _item?: CompIntermediate<T>,
): def is CompDef<T> & {
  useDataModelBindingValidation: (baseComponentId: string, bindings: CompIntermediate['dataModelBindings']) => string[];
} {
  return 'useDataModelBindingValidation' in def;
}

export function implementsIsDataModelBindingsRequired<T extends CompTypes>(
  def: CompDef<T>,
): def is CompDef<T> & {
  isDataModelBindingsRequired: (baseComponentId: string, lookups: LayoutLookups) => boolean;
} {
  return 'isDataModelBindingsRequired' in def;
}

export function isDataModelBindingsRequired(baseComponentId: string, lookups: LayoutLookups): boolean {
  const component = lookups.getComponent(baseComponentId);
  if (!component) {
    return false;
  }
  const def = getComponentDef(component.type);
  return implementsIsDataModelBindingsRequired(def) ? def.isDataModelBindingsRequired(baseComponentId, lookups) : false;
}

export function implementsSubRouting<T extends CompTypes>(def: CompDef<T>): def is CompDef<T> & SubRouting {
  return 'subRouting' in def;
}

export function implementsIsChildHidden<T extends CompTypes>(
  def: CompDef<T>,
): def is CompDef<T> & {
  isChildHidden: (parentBaseId: string, childBaseId: string, layoutLookups: LayoutLookups) => boolean;
} {
  return 'isChildHidden' in def;
}
