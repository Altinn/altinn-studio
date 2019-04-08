import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as formFillerActions from './actions/index';

export interface IFormFillerActionDispatchers extends ActionCreatorsMapObject {
  updateFormData: (
    componentID: string,
    formData: any,
    dataModelElement: IDataModelFieldElement,
    dataModelBinding?: string,
  ) => formFillerActions.IUpdateFormDataAction;
  updateFormDataFulfilled: (
    componentID: string,
    formData: any,
    dataModelBinding: string,
    validationResults: IComponentValidations,
  ) => formFillerActions.IUpdateFormDataActionFulfilled;
  updateFormDataRejected: (
    error: Error,
  ) => formFillerActions.IUpdateFormDataActionRejected;
  submitFormData: (url: string, apiMode?: string) => formFillerActions.ISubmitFormDataAction;
  submitFormDataFulfilled: (apiResult: any) => formFillerActions.ISubmitFormDataActionFulfilled;
  submitFormDataRejected: (error: Error) => formFillerActions.ISubmitFormDataActionRejected;
  fetchFormData: (url: string) => formFillerActions.IFetchFormDataAction;
  fetchFormDataFulfilled: (formData: any) => formFillerActions.IFetchFormDataActionFulfilled;
  fetchFormDataRejected: (error: Error) => formFillerActions.IFetchFormDataActionRejected;
  updateValidationErrors: (validationResults: IValidationResults) => formFillerActions.IUpdateValidationResults;
  resetFormData: (url: string) => formFillerActions.IResetFormDataAction;
  resetFormDataFulfilled: (formData: any) => formFillerActions.IResetFormDataActionFulfilled;
  runSingleFieldValidation: (url: string, componentId: any) => formFillerActions.IRunSingleFieldValidationAction;
  runSingleFieldValidationFulfilled: (
    validationErrors: any,
  ) => formFillerActions.IRunSingleFieldValidationActionFulfilled;
  runSingleFieldValidationRejected: (error: Error) => formFillerActions.IRunSingleFieldValidationActionRejected;
  completeAndSendInForm: (url: any) => formFillerActions.ICompleteAndSendInForm;
  completeAndSendInFormFulfilled: () => Action;
  completeAndSendInFormRejected: () => Action;
  uploadAttachment: (
    file: File,
    fileType: string,
    attachmentId: string,
    componentId: string,
  ) => formFillerActions.IUploadAttachmentAction;
  uploadAttachmentFulfilled: (
    attachment: IAttachment,
    fileType: string,
    tmpAttachmentId: string,
    componentId: string)
    => formFillerActions.IUploadAttachmentActionFulfilled;
  uploadAttachmentRejected: (
    attachmentId: string,
    attachmentType: string,
    componentId: string,
    validationMessages: IComponentValidations,
  ) => formFillerActions.IUploadAttachmentActionRejected;
  deleteAttachment: (
    attachment: IAttachment,
    attachmentType: string,
    componentId: string,
  ) => formFillerActions.IDeleteAttachmentAction;
  deleteAttachmentFulfilled: (
    attachmentId: string,
    attachmentType: string,
    componentId: string,
  ) => formFillerActions.IDeleteAttachmentActionFulfilled;
  deleteAttachmentRejected: (
    attachment: IAttachment,
    attachmentType: string,
    componentId: string,
    validationMessages: IComponentValidations,
  ) => formFillerActions.IDeleteAttachmentActionRejected;
  fetchAttachments: () => Action;
  fetchAttachmentsFulfilled: (attachments: IAttachments) => formFillerActions.IFetchAttachmentsActionFulfilled;
  fetchAttachmentsRejected: (error: Error) => formFillerActions.IFetchAttachmentsActionRejected;
}

const actions: IFormFillerActionDispatchers = {
  updateFormData: formFillerActions.updateFormDataAction,
  updateFormDataFulfilled: formFillerActions.updateFormDataActionFulfilled,
  updateFormDataRejected: formFillerActions.updateFormDataActionRejected,
  submitFormData: formFillerActions.submitFormDataAction,
  submitFormDataFulfilled: formFillerActions.submitFormDataActionFulfilled,
  submitFormDataRejected: formFillerActions.submitFormDataActionRejected,
  fetchFormData: formFillerActions.fetchFormDataAction,
  fetchFormDataFulfilled: formFillerActions.fetchFormDataActionFulfilled,
  fetchFormDataRejected: formFillerActions.fetchFormDataActionRejected,
  updateValidationErrors: formFillerActions.updateValidationErrors,
  resetFormData: formFillerActions.resetFormDataAction,
  resetFormDataFulfilled: formFillerActions.resetFormDataFulfilled,
  runSingleFieldValidation: formFillerActions.runSingleFieldValidationAction,
  runSingleFieldValidationFulfilled: formFillerActions.runSingleFieldValidationActionFulfilled,
  runSingleFieldValidationRejected: formFillerActions.runSingleFieldValidationActionRejected,
  completeAndSendInForm: formFillerActions.completeAndSendInForm,
  completeAndSendInFormFulfilled: formFillerActions.completeAndSendInFormFulfilled,
  completeAndSendInFormRejected: formFillerActions.completeAndSendInFormRejected,
  uploadAttachment: formFillerActions.uploadAttachment,
  uploadAttachmentFulfilled: formFillerActions.uploadAttachmentFulfilled,
  uploadAttachmentRejected: formFillerActions.uploadAttachmentRejected,
  deleteAttachment: formFillerActions.deleteAttachment,
  deleteAttachmentFulfilled: formFillerActions.deleteAttachmentFulfilled,
  deleteAttachmentRejected: formFillerActions.deleteAttachmentRejected,
  fetchAttachments: formFillerActions.fetchAttachments,
  fetchAttachmentsFulfilled: formFillerActions.fetchAttachmentsFulfilled,
  fetchAttachmentsRejected: formFillerActions.fetchAttachmentsRejected,
};

const FormFillerActionDispatchers: IFormFillerActionDispatchers = bindActionCreators<
  any,
  IFormFillerActionDispatchers
>(actions, store.dispatch);
export default FormFillerActionDispatchers;
