import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IErrorState } from '../features/error/errorSlice';
import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { ComponentType } from '../components';
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

export type IExternalFormLayouts = KeyValuePairs<IExternalFormLayout>;

export interface IExternalFormLayout {
  $schema: string;
  data: IExternalData;
  [key: string]: any;
}

export interface IExternalComponent {
  id: string;
  type: ComponentType;
  [key: string]: any; // Todo: Set type here
}

export interface IExternalData {
  layout: IExternalComponent[];
  hidden?: boolean;
  [key: string]: any;
}

export type IFormLayoutOrder = KeyValuePairs<string[]>;

export interface IDataModelFieldElement {
  choices?: any;
  customProperties?: any;
  dataBindingName: string;
  displayString: string;
  fixedValue?: any;
  id: string;
  isReadOnly: boolean;
  isTagContent: boolean;
  jsonSchemaPointer: string;
  maxOccurs: number;
  minOccurs: number;
  name: string;
  parentElement: string;
  restrictions: any;
  texts: any;
  type: string;
  typeName?: string;
  xmlSchemaXPath: string;
  xName?: string;
  xPath: string;
  xsdValueType?: string;
}

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
