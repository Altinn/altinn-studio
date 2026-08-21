import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type { ITextResource } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { BooleanExpression } from '@studio/components';
import type React from 'react';
import type {
  IDataModelReference,
  IRawDataModelBinding,
} from '@app/layout-contract/generated/common.generated';
import type { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface IOption {
  label: string;
  value?: any;
}

export type ITextResourceBindings = KeyValuePairs<ExprValToActualOrExpr<ExprVal.String>>;

export type ExplicitDataModelBinding = IDataModelReference;

export type IDataModelBindingsKeyValueExplicit = KeyValuePairs<ExplicitDataModelBinding>;
export type IDataModelBindingsKeyValue = KeyValuePairs<IRawDataModelBinding>;
export type IDataModelBindings = IRawDataModelBinding;

export type IFormDesignerComponents = KeyValuePairs<FormComponent>;
export type IFormDesignerContainers = KeyValuePairs<FormContainer>;
export type IFormLayouts = KeyValuePairs<IInternalLayout>;

export interface IInternalLayout {
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  order: IFormLayoutOrder;
  pageIndexes?: KeyValuePairs<number>;
  hidden?: BooleanExpression;
  customRootProperties: KeyValuePairs;
  customDataProperties: KeyValuePairs;
}

export type InternalLayoutData = Omit<IInternalLayout, 'customRootProperties'>;
export type InternalLayoutComponents = Omit<InternalLayoutData, 'customDataProperties'>;

export interface IInternalLayoutWithName {
  layout: IInternalLayout;
  layoutName: string;
}

export type IFormLayoutOrder = KeyValuePairs<string[]>;

export interface IWidget {
  components: any[];
  texts: IWidgetTexts[];
  displayName: ComponentType;
}

export interface IWidgetTexts {
  language: string;
  resources: ITextResource[];
}

export interface IToolbarElement {
  label: string;
  icon?: React.ComponentType;
  type: ComponentType | CustomComponentType;
}

export enum CollapsableMenus {
  Components = 'standard',
  Texts = 'texts',
  AdvancedComponents = 'advanced',
  // TODO : Uncomment when we have widgets components
  // Widgets = 'widget',
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export type FormLayoutsSelector<T> = (formLayoutsData: IFormLayouts) => T;
