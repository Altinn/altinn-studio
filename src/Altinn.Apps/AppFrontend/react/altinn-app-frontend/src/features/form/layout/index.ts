import { GridSize } from '@material-ui/core';
import { IOption, Triggers } from '../../../types';

export interface ILayouts {
  [id: string]: ILayout;
}

export interface ILayoutEntry {
  id: string;
  type: GroupTypes | ComponentTypes;
  triggers?: Triggers[];
}

export interface ILayoutGroup extends ILayoutEntry {
  children: string[];
  dataModelBindings?: IDataModelBindings;
  maxCount: number;
  textResourceBindings?: ITextResourceBindings;
  tableHeaders?: string[];
  edit?: IGroupEditProperties;
}

export interface ILayoutComponent extends ILayoutEntry {
  dataModelBindings: IDataModelBindings;
  isValid?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  textResourceBindings: ITextResourceBindings;
  formData?: any;
  grid?: IGrid;
}

export type GroupTypes = 'Group' | 'group';

export type ComponentTypes =
  | 'AddressComponent'
  | 'AttachmentList'
  | 'Button'
  | 'Checkboxes'
  | 'Datepicker'
  | 'Dropdown'
  | 'FileUpload'
  | 'Header'
  | 'Input'
  | 'NavigationButtons'
  | 'InstantiationButton'
  | 'Paragraph'
  | 'Image'
  | 'RadioButtons'
  | 'Summary'
  | 'TextArea';

export interface IDataModelBindings {
  [id: string]: string;
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export type ILayout = Array<ILayoutComponent | ILayoutGroup>;

export interface ISelectionComponentProps extends ILayoutComponent {
  options?: IOption[];
  optionsId?: string;
}

export interface IGrid extends IGridStyling {
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

export interface IGridStyling {
  xs?: GridSize;
  sm?: GridSize;
  md?: GridSize;
  lg?: GridSize;
  xl?: GridSize;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll';
  filter?: IGroupFilter[];
  addButton?: boolean;
  saveButton?: boolean;
  deleteButton?: boolean;
  multiPage?: boolean;
  openByDefault?: boolean;
}

export interface IGroupFilter {
  key: string;
  value: string;
}
