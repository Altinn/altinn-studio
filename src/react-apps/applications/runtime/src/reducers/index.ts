import {
  combineReducers,
  ReducersMapObject,
  Reducer,
} from 'redux';
import LayoutReducer, { ILayoutState } from '../features/form/Layout/reducer'

interface IRuntimeState<T1> {
  layout: T1;
}

export interface IReducers extends IRuntimeState<Reducer<ILayoutState>>, ReducersMapObject {
}

const reducers: IReducers = {
  layout: LayoutReducer,
};

export default combineReducers(reducers);
