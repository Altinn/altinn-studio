import { createContext } from 'react';

import { AddressComponent as Address } from 'src/components/advanced/AddressComponent';
import { AttachmentListComponent } from 'src/components/base/AttachmentListComponent';
import {
  ButtonComponent,
  InstantiationButtonComponent,
} from 'src/components/base/ButtonComponent';
import { CheckboxContainerComponent } from 'src/components/base/CheckboxesContainerComponent';
import DatepickerComponent from 'src/components/base/DatepickerComponent';
import DropdownComponent from 'src/components/base/DropdownComponent';
import { FileUploadComponent } from 'src/components/base/FileUpload/FileUploadComponent';
import { FileUploadWithTagComponent } from 'src/components/base/FileUpload/FileUploadWithTag/FileUploadWithTagComponent';
import { HeaderComponent } from 'src/components/base/HeaderComponent';
import { ImageComponent } from 'src/components/base/ImageComponent';
import { InputComponent } from 'src/components/base/InputComponent';
import { LikertComponent } from 'src/components/base/LikertComponent';
import { MapComponent } from 'src/components/base/MapComponent';
import { MultipleSelect } from 'src/components/base/MultipleSelect';
import { NavigationBar as NavigationBarComponent } from 'src/components/base/NavigationBar';
import { PanelComponent } from 'src/components/base/PanelComponent';
import { ParagraphComponent } from 'src/components/base/ParagraphComponent';
import { PrintButtonComponent } from 'src/components/base/PrintButtonComponent';
import { RadioButtonContainerComponent } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';
import { TextAreaComponent } from 'src/components/base/TextAreaComponent';
import CustomComponent from 'src/components/custom/CustomWebComponent';
import { NavigationButtons as NavigationButtonsComponent } from 'src/components/presentation/NavigationButtons';
import type { IGenericComponentProps } from 'src/components/GenericComponent';
import type {
  ComponentExceptGroupAndSummary,
  IGrid,
} from 'src/features/form/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

import type { ILanguage } from 'altinn-shared/types';

const components: {
  [Type in ComponentExceptGroupAndSummary]: (props: any) => JSX.Element;
} = {
  AddressComponent: Address,
  AttachmentList: AttachmentListComponent,
  Button: ButtonComponent,
  Checkboxes: CheckboxContainerComponent,
  Custom: CustomComponent,
  DatePicker: DatepickerComponent,
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
};

export interface IComponentProps extends IGenericComponentProps {
  handleDataChange: (
    value: string,
    options?: {
      key?: string; // Defaults to simpleBinding
      validate?: boolean; // Defaults to true
    },
  ) => void;
  getTextResource: (key: string) => React.ReactNode;
  getTextResourceAsString: (key: string) => string;
  language: ILanguage;
  shouldFocus: boolean;
  text: React.ReactNode;
  label: () => JSX.Element;
  legend: () => JSX.Element;
  formData?: IComponentFormData;
  isValid?: boolean;
}

export interface IFormComponentContext {
  grid?: IGrid;
  baseComponentId?: string;
}

export const FormComponentContext = createContext<IFormComponentContext>({
  grid: undefined,
  baseComponentId: undefined,
});

export default components;
