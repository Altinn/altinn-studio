import { createContext } from 'react';
import type React from 'react';

import { ActionButton } from 'src/layout/ActionButton/index';
import { Address } from 'src/layout/Address/index';
import { AttachmentList } from 'src/layout/AttachmentList/index';
import { Button } from 'src/layout/Button/index';
import { ButtonGroup } from 'src/layout/ButtonGroup/index';
import { Checkboxes } from 'src/layout/Checkboxes/index';
import { Custom } from 'src/layout/Custom/index';
import { Datepicker } from 'src/layout/Datepicker/index';
import { Dropdown } from 'src/layout/Dropdown/index';
import { FileUpload } from 'src/layout/FileUpload/index';
import { FileUploadWithTag } from 'src/layout/FileUploadWithTag/index';
import { Grid } from 'src/layout/Grid';
import { Group } from 'src/layout/Group';
import { Header } from 'src/layout/Header/index';
import { IFrame } from 'src/layout/Iframe';
import { Image } from 'src/layout/Image/index';
import { Input } from 'src/layout/Input/index';
import { InstanceInformation } from 'src/layout/InstanceInformation/index';
import { InstantiationButton } from 'src/layout/InstantiationButton/index';
import { Likert } from 'src/layout/Likert/index';
import { Link } from 'src/layout/Link';
import { List } from 'src/layout/List/index';
import { Map } from 'src/layout/Map/index';
import { MultipleSelect } from 'src/layout/MultipleSelect/index';
import { NavigationBar } from 'src/layout/NavigationBar/index';
import { NavigationButtons } from 'src/layout/NavigationButtons/index';
import { Panel } from 'src/layout/Panel/index';
import { Paragraph } from 'src/layout/Paragraph/index';
import { PrintButton } from 'src/layout/PrintButton/index';
import { RadioButtons } from 'src/layout/RadioButtons/index';
import { Summary } from 'src/layout/Summary';
import { TextArea } from 'src/layout/TextArea/index';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { ComponentTypes, IGrid } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { IComponentValidations } from 'src/types';
import type { ILanguage } from 'src/types/shared';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { AnyItem, LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export const components = {
  ActionButton: new ActionButton(),
  AddressComponent: new Address(),
  AttachmentList: new AttachmentList(),
  Button: new Button(),
  ButtonGroup: new ButtonGroup(),
  Checkboxes: new Checkboxes(),
  Custom: new Custom(),
  Datepicker: new Datepicker(),
  Dropdown: new Dropdown(),
  FileUpload: new FileUpload(),
  FileUploadWithTag: new FileUploadWithTag(),
  Grid: new Grid(),
  Header: new Header(),
  Image: new Image(),
  Input: new Input(),
  InstanceInformation: new InstanceInformation(),
  InstantiationButton: new InstantiationButton(),
  Likert: new Likert(),
  Link: new Link(),
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
  Group: new Group(),
  Summary: new Summary(),
  IFrame: new IFrame(),
};

export type ComponentClassMap = typeof components;
export type ComponentClassMapTypes = {
  [K in keyof ComponentClassMap]: ComponentClassMap[K]['type'];
};

// noinspection JSUnusedLocalSymbols
/**
 * This type is only used to make sure all components exist and are correct in the list above. If any component is
 * missing above, this type will give you an error.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _componentsTypeCheck: {
  [Type in ComponentTypes]: LayoutComponent<Type>;
} = {
  ...components,
};

export interface IComponentProps {
  handleDataChange: (
    value: string | undefined,
    options?: {
      key?: string; // Defaults to simpleBinding
      validate?: boolean; // Defaults to true
    },
  ) => void;
  getTextResource: (key: string | undefined) => React.ReactNode;
  getTextResourceAsString: (key: string | undefined) => string | undefined;
  language: ILanguage;
  shouldFocus: boolean;
  text: React.ReactNode | string;
  texts?: {
    [textResourceKey: string]: React.ReactNode;
  };
  label: () => JSX.Element | null;
  legend: () => JSX.Element | null;
  formData: IComponentFormData;
  isValid?: boolean;
  componentValidations?: IComponentValidations;
}

export interface PropsFromGenericComponent<T extends ComponentTypes = ComponentTypes> extends IComponentProps {
  node: LayoutNodeFromType<T>;
  overrideItemProps?: Partial<Omit<AnyItem<T>, 'id'>>;
  overrideDisplay?: IGenericComponentProps<T>['overrideDisplay'];
}

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

export function getLayoutComponentObject<T extends keyof ComponentClassMap>(type: T): ComponentClassMap[T] {
  if (type && type in components) {
    return components[type as keyof typeof components] as any;
  }
  return undefined as any;
}

export type DefGetter = typeof getLayoutComponentObject;
