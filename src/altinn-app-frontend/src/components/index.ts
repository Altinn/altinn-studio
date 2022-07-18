import { AddressComponent as Address } from './advanced/AddressComponent';
import { AttachmentListComponent } from './base/AttachmentListComponent';
import { ButtonComponent } from './base/ButtonComponent';
import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
import DatepickerComponent from './base/DatepickerComponent';
import DropdownComponent from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUpload/FileUploadComponent';
import { FileUploadWithTagComponent } from './base/FileUpload/FileUploadWithTag/FileUploadWithTagComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { ParagraphComponent } from './base/ParagraphComponent';
import { RadioButtonContainerComponent } from './base/RadioButtons/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { ImageComponent } from './base/ImageComponent';
import { NavigationButtons as NavigationButtonsComponent } from './presentation/NavigationButtons';
import { NavigationBar as NavigationBarComponent } from './base/NavigationBar';
import { PanelComponent } from './base/PanelComponent';
import { InstantiationButtonComponent } from './base/InstantiationButtonComponent';
import type { IGenericComponentProps } from './GenericComponent';
import type { ILanguage } from 'altinn-shared/types';
import type {
  IGrid,
  ComponentExceptGroupAndSummary,
} from 'src/features/form/layout';
import { createContext } from 'react';
import { LikertComponent } from 'src/components/base/LikertComponent';
import { PrintButtonComponent } from './base/PrintButtonComponent';
import CustomComponent from './custom/CustomWebComponent';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

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
};

export interface IComponentProps extends IGenericComponentProps {
  handleDataChange: (
    value: string,
    key?: string,
    skipValidation?: boolean,
    checkIfRequired?: boolean,
  ) => void;
  handleFocusUpdate: (componentId: string, step?: number) => void;
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
