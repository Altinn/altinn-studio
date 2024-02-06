import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type React from 'react';

export interface IFormDesignerNameSpace<T1, T2> {
  formDesigner: T1;
  appData: T2;
}
export type IAppState = IFormDesignerNameSpace<IFormDesignerState, IAppDataState>;

export interface IOption {
  label: string;
  value: any;
}

export type ITextResourceBindings = KeyValuePairs<string>;

export type IDataModelBindings = KeyValuePairs<string>;
export type IFormDesignerComponents = KeyValuePairs<FormComponent>;
export type IFormDesignerContainers = KeyValuePairs<FormContainer>;
export type IFormLayouts = KeyValuePairs<IInternalLayout>;

export interface IInternalLayout {
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  order: IFormLayoutOrder;
  hidden?: any;
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

export interface IRuleModelFieldElement {
  type: 'rule' | 'condition';
  name: string;
  inputs: any;
}

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
  type: ComponentType;
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

export type AppStateSelector<T> = (state: IAppState) => T;

export type FormLayoutsSelector<T> = (formLayoutsData: IFormLayouts) => T;

export type TextResourcesSelector<T> = (textResources: ITextResources) => T;
