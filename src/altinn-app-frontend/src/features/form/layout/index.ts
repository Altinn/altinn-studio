import type { GridSize } from "@material-ui/core";
import type {
  IMapping,
  IOption,
  IOptionSource,
  Triggers,
} from "../../../types";

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
  optionsId?: string;
  options?: IOption[];
  disabled?: boolean;
  required?: boolean;
  textResourceBindings: ITextResourceBindings;
  formData?: any;
  grid?: IGrid;
}

export type GroupTypes = "Group" | "group";

export type ComponentTypes =
  | "AddressComponent"
  | "AttachmentList"
  | "Button"
  | "Checkboxes"
  | "Datepicker"
  | "Dropdown"
  | "FileUpload"
  | "FileUploadWithTag"
  | "Header"
  | "Input"
  | "NavigationButtons"
  | "InstantiationButton"
  | "Paragraph"
  | "Image"
  | "RadioButtons"
  | "Summary"
  | "TextArea"
  | "NavigationBar"
  | "Likert"
  | "Panel";

export interface IDataModelBindingsSimple {
  simpleBinding: string;
}

export interface IDataModelBindingsForGroup {
  group: string;
}

/**
 * A middle ground between group and simple bindings, a list binding can be used to
 * store a list of primitive values, like string[].
 */
export interface IDataModelBindingsList {
  list: string;
}

export interface IDataModelBindingsForAddress {
  address: string;
  zipCode: string;
  postPlace: string;
  careOf?: string;
  houseNumber?: string;
}

export type IDataModelBindings = Partial<IDataModelBindingsSimple> &
  Partial<IDataModelBindingsList> &
  Partial<IDataModelBindingsForGroup> &
  Partial<IDataModelBindingsForAddress>;

export interface ITextResourceBindings {
  [id: string]: string;
}

export type ILayout = Array<ILayoutComponent | ILayoutGroup>;

export interface ISelectionComponentProps extends ILayoutComponent {
  options?: IOption[];
  optionsId?: string;
  mapping?: IMapping;
  secure?: boolean;
  source?: IOptionSource;
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
  mode?: "hideTable" | "showTable" | "showAll" | "likert";
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
