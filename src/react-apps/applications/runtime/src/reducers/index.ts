import {
  combineReducers,
  ReducersMapObject,
  Reducer,
} from 'redux';
import FormLayoutReducer, { ILayoutState } from '../features/form/FormLayout/reducer';
import FormDataReducer, { IFormDataState } from '../features/form/FormData/reducer';

interface IRuntimeState<T1, T2> {
  formLayout: T1;
  formData: T2;
}

export interface IReducers extends IRuntimeState<Reducer<ILayoutState>, Reducer<IFormDataState>>, ReducersMapObject {
}

const reducers: IReducers = {
  formLayout: FormLayoutReducer,
  formData: FormDataReducer,
};

export default combineReducers(reducers);
