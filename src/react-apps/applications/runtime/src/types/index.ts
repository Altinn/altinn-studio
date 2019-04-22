import { IFormConfigState } from '../features/form/config/reducer';
import { IFormDataState } from '../features/form/data/reducer';
import { IDataModelState } from '../features/form/datamodell/reducer';
import { IFormDynamicState } from '../features/form/dynamics/reducer';
import { IFormFileUploadState } from '../features/form/fileUpload/reducer';
import { ILayoutState } from '../features/form/layout/reducer';
import { IResourceState } from '../features/form/resources/reducer';
import { IWorkflowState } from '../features/form/workflow/reducer';
import { ILanguageState } from '../features/languages/reducer';

export interface IRuntimeState {
  formLayout: ILayoutState;
  formData: IFormDataState;
  formConfig: IFormConfigState;
  formWorkflow: IWorkflowState;
  formDataModel: IDataModelState;
  formAttachments: IFormFileUploadState;
  formDynamics: IFormDynamicState;
  language: ILanguageState;
  formResources: IResourceState;
}

export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}
