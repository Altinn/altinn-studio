import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IErrorState } from '../features/error/errorSlice';
import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ITextResource, ITextResources } from 'app-shared/types/global';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FormComponent } from './FormComponent';
import { FormContainer } from './FormContainer';

export interface IFormDesignerNameSpace<T1, T2, T3> {
  formDesigner: T1;
  appData: T2;
  errors: T3;
}
export type IAppState = IFormDesignerNameSpace<
  IFormDesignerState,
  IAppDataState,
  IErrorState
>;

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
  icon?: string;
  type: ComponentType;
}

export enum CollapsableMenus {
  Components = 'schema',
  Texts = 'texts',
  AdvancedComponents = 'advanced',
  Widgets = 'widget',
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export type AppStateSelector<T> = (state: IAppState) => T;

export type FormLayoutsSelector<T> = (state: IAppState, formLayoutsData: IFormLayouts) => T;

export type TextResourcesSelector<T> = (textResources: ITextResources) => T;
