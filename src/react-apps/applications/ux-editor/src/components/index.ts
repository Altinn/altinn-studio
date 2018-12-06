import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
import { DropdownComponent } from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUploadComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { ParagraphComponent } from './base/ParagraphComponent';
import { RadioButtonContainerComponent } from './base/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { SubmitComponent } from './widget/SubmitComponent';

export interface IComponent {
  name: string;
  Tag: any;
  customProperties?: any;
}

const components: IComponent[] = [
  {
    name: 'Header',
    Tag: HeaderComponent,
  },
  {
    name: 'Paragraph',
    Tag: ParagraphComponent,
  },
  {
    name: 'Input',
    Tag: InputComponent,
  },
  {
    name: 'Dropdown',
    Tag: DropdownComponent,
    customProperties: {
      options: [],
    },
  },
  {
    name: 'Checkboxes',
    Tag: CheckboxContainerComponent,
  },
  {
    name: 'RadioButtons',
    Tag: RadioButtonContainerComponent,
    customProperties: {
      options: [],
    },
  },
  {
    name: 'TextArea',
    Tag: TextAreaComponent,
  },
  {
    name: 'FileUpload',
    Tag: FileUploadComponent,
  },
  {
    name: 'Submit',
    Tag: SubmitComponent,
    customProperties: {
      textResourceId: 'Standard.Button.Submit',
      customType: 'Standard',
    },
  },
];

export default components;
