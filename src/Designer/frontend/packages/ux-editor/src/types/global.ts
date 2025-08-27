import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { BooleanExpression } from 'libs/studio-components-legacy/src';
import type React from 'react';

export interface IOption {
  label: string;
  value: any;
}

export type ITextResourceBindings = KeyValuePairs<string>;

export type ImplicitDataModelBinding = string;
export type ExplicitDataModelBinding = {
  dataType: string;
  field: string;
};

export type IDataModelBindingsKeyValueExplicit = KeyValuePairs<ExplicitDataModelBinding>;
export type IDataModelBindingsKeyValue =
  | KeyValuePairs<ImplicitDataModelBinding>
  | KeyValuePairs<ExplicitDataModelBinding>;
export type IDataModelBindings = ImplicitDataModelBinding | ExplicitDataModelBinding;

export type IFormDesignerComponents = KeyValuePairs<FormComponent>;
export type IFormDesignerContainers = KeyValuePairs<FormContainer>;
export type IFormLayouts = KeyValuePairs<IInternalLayout>;

export interface IInternalLayout {
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  order: IFormLayoutOrder;
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

export type TextResourcesSelector<T> = (textResources: ITextResources) => T;
