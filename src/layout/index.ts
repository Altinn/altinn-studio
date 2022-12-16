import { createContext } from 'react';
import type React from 'react';

import { AddressComponent as Address } from 'src/layout/Address/AddressComponent';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { FileUploadWithTagComponent } from 'src/layout/FileUploadWithTag/FileUploadWithTagComponent';
import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { ListComponent } from 'src/layout/List/ListComponent';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MultipleSelect } from 'src/layout/MultipleSelect/MultipleSelect';
import { NavigationBar as NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBar';
import { NavigationButtons as NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtons';
import { PanelComponent } from 'src/layout/Panel/PanelComponent';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';
import { RadioButtonContainerComponent } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';
import { TextAreaComponent } from 'src/layout/TextArea/TextAreaComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { ComponentExceptGroup, ComponentExceptGroupAndSummary, IGrid, ILayoutComponent } from 'src/layout/layout';
import type { ILanguage } from 'src/types/shared';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

const components: {
  [Type in ComponentExceptGroupAndSummary]: (props: any) => JSX.Element | null;
} = {
  AddressComponent: Address,
  AttachmentList: AttachmentListComponent,
  Button: ButtonComponent,
  Checkboxes: CheckboxContainerComponent,
  Custom: CustomWebComponent,
  Datepicker: DatepickerComponent,
  Dropdown: DropdownComponent,
  FileUpload: FileUploadComponent,
  FileUploadWithTag: FileUploadWithTagComponent,
  Header: HeaderComponent,
  Image: ImageComponent,
  Input: InputComponent,
  InstantiationButton: InstantiationButtonComponent,
  Likert: LikertComponent,
  Map: MapComponent,
  MultipleSelect: MultipleSelect,
  NavigationBar: NavigationBarComponent,
  NavigationButtons: NavigationButtonsComponent,
  Panel: PanelComponent,
  Paragraph: ParagraphComponent,
  PrintButton: PrintButtonComponent,
  RadioButtons: RadioButtonContainerComponent,
  TextArea: TextAreaComponent,
  List: ListComponent,
};

export interface IComponentProps extends IGenericComponentProps {
  handleDataChange: (
    value: string | undefined,
    options?: {
      key?: string; // Defaults to simpleBinding
      validate?: boolean; // Defaults to true
    },
  ) => void;
  getTextResource: (key: string) => React.ReactNode;
  getTextResourceAsString: (key: string) => string;
  language: ILanguage;
  shouldFocus: boolean;
  text: React.ReactNode | string;
  label: () => JSX.Element;
  legend: () => JSX.Element;
  formData: IComponentFormData;
  isValid?: boolean;
}

export type PropsFromGenericComponent<T extends ComponentExceptGroup> = IComponentProps &
  ExprResolved<Omit<ILayoutComponent<T>, 'type'>>;

export interface IFormComponentContext {
  grid?: IGrid;
  id?: string;
  baseComponentId?: string;
}

export const FormComponentContext = createContext<IFormComponentContext>({
  grid: undefined,
  id: undefined,
  baseComponentId: undefined,
});

export default components;
