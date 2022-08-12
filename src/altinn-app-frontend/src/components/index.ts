import { createContext } from 'react';

import { AddressComponent as Address } from 'src/components/advanced/AddressComponent';
import { AttachmentListComponent } from 'src/components/base/AttachmentListComponent';
import { ButtonComponent } from 'src/components/base/ButtonComponent';
import { CheckboxContainerComponent } from 'src/components/base/CheckboxesContainerComponent';
import DatepickerComponent from 'src/components/base/DatepickerComponent';
import DropdownComponent from 'src/components/base/DropdownComponent';
import { FileUploadComponent } from 'src/components/base/FileUpload/FileUploadComponent';
import { FileUploadWithTagComponent } from 'src/components/base/FileUpload/FileUploadWithTag/FileUploadWithTagComponent';
import { HeaderComponent } from 'src/components/base/HeaderComponent';
import { ImageComponent } from 'src/components/base/ImageComponent';
import { InputComponent } from 'src/components/base/InputComponent';
import { InstantiationButtonComponent } from 'src/components/base/InstantiationButtonComponent';
import { LikertComponent } from 'src/components/base/LikertComponent';
import { MapComponent } from 'src/components/base/MapComponent';
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
  Header: HeaderComponent,
  Paragraph: ParagraphComponent,
  Image: ImageComponent,
  Input: InputComponent,
  DatePicker: DatepickerComponent,
  Dropdown: DropdownComponent,
  Checkboxes: CheckboxContainerComponent,
  RadioButtons: RadioButtonContainerComponent,
  TextArea: TextAreaComponent,
  FileUpload: FileUploadComponent,
  FileUploadWithTag: FileUploadWithTagComponent,
  Button: ButtonComponent,
  NavigationButtons: NavigationButtonsComponent,
  InstantiationButton: InstantiationButtonComponent,
  AttachmentList: AttachmentListComponent,
  NavigationBar: NavigationBarComponent,
  Likert: LikertComponent,
  Panel: PanelComponent,
  PrintButton: PrintButtonComponent,
  AddressComponent: Address,
  Custom: CustomComponent,
  Map: MapComponent,
};

export interface IComponentProps extends IGenericComponentProps {
  handleDataChange: (
    value: string,
    key?: string,
    skipValidation?: boolean,
    checkIfRequired?: boolean,
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
