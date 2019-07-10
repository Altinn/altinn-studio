import { IFormConfigState } from '../features/form/config/reducer';
import { IFormDataState } from '../features/form/data/reducer';
import { IDataModelState } from '../features/form/datamodell/reducer';
import { IFormDynamicState } from '../features/form/dynamics';
import { ILayoutState } from '../features/form/layout/reducer';
import { IResourceState } from '../features/form/resources/reducer';
import { IValidationState } from '../features/form/validation/reducer';
import { IWorkflowState } from '../features/form/workflow/reducer';
import { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import { ILanguageState } from '../shared/resources/language/languageReducers';
import { IProfileState } from '../shared/resources/profile/profileReducers';

export interface IRuntimeState {
  formLayout: ILayoutState;
  formData: IFormDataState;
  formConfig: IFormConfigState;
  formWorkflow: IWorkflowState;
  formDataModel: IDataModelState;
  attachments: IAttachmentState;
  formDynamics: IFormDynamicState;
  language: ILanguageState;
  formResources: IResourceState;
  profile: IProfileState;
  formValidations: IValidationState;
}

export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}
