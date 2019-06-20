import { IFormConfigState } from '../features/form/config/reducer';
import { IFormDataState } from '../features/form/data/reducer';
import { IDataModelState } from '../features/form/datamodell/reducer';
import { IFormDynamicState } from '../features/form/dynamics';
import { ILayoutState } from '../features/form/layout/reducer';
import { IResourceState } from '../features/form/resources/reducer';
import { IFormUserState } from '../features/form/user/reducer';
import { IValidationState } from '../features/form/validation/reducer';
import { IWorkflowState } from '../features/form/workflow/reducer';
import { ILanguageState } from '../features/languages/reducer';
import { IAttachmentState } from '../sharedResources/attachments/attachmentReducer';

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
  formUser: IFormUserState;
  formValidations: IValidationState;
}

export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}
