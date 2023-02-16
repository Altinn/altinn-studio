import { createContext } from 'react';
import type React from 'react';

import { Address } from 'src/layout/Address/index';
import { AttachmentList } from 'src/layout/AttachmentList/index';
import { Button } from 'src/layout/Button/index';
import { Checkboxes } from 'src/layout/Checkboxes/index';
import { Custom } from 'src/layout/Custom/index';
import { Datepicker } from 'src/layout/Datepicker/index';
import { Dropdown } from 'src/layout/Dropdown/index';
import { FileUpload } from 'src/layout/FileUpload/index';
import { FileUploadWithTag } from 'src/layout/FileUploadWithTag/index';
import { Header } from 'src/layout/Header/index';
import { Image } from 'src/layout/Image/index';
import { Input } from 'src/layout/Input/index';
import { InstanceInformation } from 'src/layout/InstanceInformation/index';
import { InstantiationButton } from 'src/layout/InstantiationButton/index';
import { Likert } from 'src/layout/Likert/index';
import { List } from 'src/layout/List/index';
import { Map } from 'src/layout/Map/index';
import { MultipleSelect } from 'src/layout/MultipleSelect/index';
import { NavigationBar } from 'src/layout/NavigationBar/index';
import { NavigationButtons } from 'src/layout/NavigationButtons/index';
import { Panel } from 'src/layout/Panel/index';
import { Paragraph } from 'src/layout/Paragraph/index';
import { PrintButton } from 'src/layout/PrintButton/index';
import { RadioButtons } from 'src/layout/RadioButtons/index';
import { TextArea } from 'src/layout/TextArea/index';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { ComponentExceptGroup, ComponentExceptGroupAndSummary, IGrid, ILayoutComponent } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { IComponentValidations } from 'src/types';
import type { ILanguage } from 'src/types/shared';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

export const components: {
  [Type in ComponentExceptGroupAndSummary]: LayoutComponent<Type>;
} = {
  AddressComponent: new Address(),
  AttachmentList: new AttachmentList(),
  Button: new Button(),
  Checkboxes: new Checkboxes(),
  Custom: new Custom(),
  Datepicker: new Datepicker(),
  Dropdown: new Dropdown(),
  FileUpload: new FileUpload(),
  FileUploadWithTag: new FileUploadWithTag(),
  Header: new Header(),
  Image: new Image(),
  Input: new Input(),
  InstanceInformation: new InstanceInformation(),
  InstantiationButton: new InstantiationButton(),
  Likert: new Likert(),
  Map: new Map(),
  MultipleSelect: new MultipleSelect(),
  NavigationBar: new NavigationBar(),
  NavigationButtons: new NavigationButtons(),
  Panel: new Panel(),
  Paragraph: new Paragraph(),
  PrintButton: new PrintButton(),
  RadioButtons: new RadioButtons(),
  TextArea: new TextArea(),
  List: new List(),
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
  componentValidations?: IComponentValidations;
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

/**
 * This enum is used to distinguish purly presentational components
 * from interactive form components that can have formData etc.
 */
export enum ComponentType {
  Presentation = 'presentation',
  Form = 'form',
  Button = 'button',
}
