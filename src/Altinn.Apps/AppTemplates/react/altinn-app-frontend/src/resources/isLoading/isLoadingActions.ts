import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../redux/store';

import * as DataTaskIsLoadingActions from './dataTask/dataTaskIsLoadingActions';

export interface IIsloadingActions extends ActionCreatorsMapObject {
  startDataTaskIsloading: () => DataTaskIsLoadingActions.IDataTaskIsloading;
  finishDataTaskIsloading: () => DataTaskIsLoadingActions.IDataTaskIsloading;
}

const actions: IIsloadingActions = {
  startDataTaskIsloading: DataTaskIsLoadingActions.startDataTaskIsloading,
  finishDataTaskIsloading: DataTaskIsLoadingActions.finishDataTaskIsloading,
};

const IsLoadingActions: IIsloadingActions = bindActionCreators<any, any>(actions, store.dispatch);

export default IsLoadingActions;
