import { FormComponentType } from '../../types/global';
import { ComponentTypes, EditSettings } from '../index';
import { EditDataModelBindings } from './EditDataModelBindings';
import { EditDescription } from './EditDescription';
import { EditHeaderSize } from './EditHeaderSize';
import { EditReadOnly } from './EditReadOnly';
import { EditRequired } from './EditRequired';
import { EditTitle } from './EditTitle';

export interface IGenericEditComponent {
  component: FormComponentType;
  handleComponentChange: (component: FormComponentType) => void;
}

export const editBoilerPlate = [
  EditSettings.DataModelBindings,
  EditSettings.Title,
  EditSettings.Description,
  EditSettings.ReadOnly,
  EditSettings.Required,
]

export interface IComponentEditConfig {
  [id: string]: EditSettings[];
}

interface IConfigComponents {
  [id: string]: ({ component, handleComponentChange, }: IGenericEditComponent) => JSX.Element;
}

export const componentSpecificEditConfig: IComponentEditConfig = {
  [ComponentTypes.Header]: [
    EditSettings.Title,
    EditSettings.Size,
  ],
  [ComponentTypes.Input]: [...editBoilerPlate],
  [ComponentTypes.TextArea]: [...editBoilerPlate],
  [ComponentTypes.Datepicker]: [...editBoilerPlate],
  [ComponentTypes.Paragraph]: [EditSettings.Title],
  [ComponentTypes.AttachmentList]: [EditSettings.Title]
}

export const configComponents: IConfigComponents = {
  [EditSettings.DataModelBindings]: EditDataModelBindings,
  [EditSettings.Size]: EditHeaderSize,
  [EditSettings.Title]: EditTitle,
  [EditSettings.ReadOnly]: EditReadOnly,
  [EditSettings.Required]: EditRequired,
  [EditSettings.Description]: EditDescription,
}
