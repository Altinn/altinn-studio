import {
  combineReducers,
  ReducersMapObject,
  Reducer,
} from 'redux';
import FormLayoutReducer, { ILayoutState } from '../features/form/layout/reducer';
import FormDataReducer, { IFormDataState } from '../features/form/data/reducer';
import FormWorkflowReducer, { IWorkflowState } from '../features/form/workflow/reducer';
import FormConfigState, { IFormConfigState } from '../features/form/config/reducer';
import FormDataModel, { IDataModelState } from '../features/form/datamodell/reducer';
import LanguageReducer, { ILanguageState } from '../features/languages/reducer';

export interface IReducers<T1, T2, T3, T4, T5, T6> {
  formLayout: T1;
  formData: T2;
  formConfig: T3;
  formWorkflow: T4;
  formDataModel: T5;
  language: T6;
}

export interface IRuntimeState extends
  IReducers<
  Reducer<ILayoutState>,
  Reducer<IFormDataState>,
  Reducer<IFormConfigState>,
  Reducer<IWorkflowState>,
  Reducer<IDataModelState>,
  Reducer<ILanguageState>
  >,
  ReducersMapObject {
}

const reducers: IRuntimeState = {
  formLayout: FormLayoutReducer,
  formData: FormDataReducer,
  formConfig: FormConfigState,
  formWorkflow: FormWorkflowReducer,
  formDataModel: FormDataModel,
  language: LanguageReducer,
};

export default combineReducers(reducers);
