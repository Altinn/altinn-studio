import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as DataModelingActions from './dataModelingActions';

export interface IDataModelingDispatchers extends ActionCreatorsMapObject {
  fetchDataModel: () => Action;
  fetchDataModelFulfilled: (result: any) => DataModelingActions.IFetchDataModelFulfilled;
  fetchDataModelRejected: (result: Error) => DataModelingActions.IFetchDataModelRejected;
  saveDataModel: (url: string, schema: any) => DataModelingActions.ISaveDataModelAction;
  saveDataModelFulfilled: () => Action;
  saveDataModelRejected: (result: Error) => DataModelingActions.ISaveDataModelRejected;
  setDataModelFilePath: (filePath: string) => DataModelingActions.ISetDataModelFilePath;
}

const actions: IDataModelingDispatchers = {
  fetchDataModel: DataModelingActions.fetchDataModelAction,
  fetchDataModelFulfilled: DataModelingActions.fetchDataModelFulfilledAction,
  fetchDataModelRejected: DataModelingActions.fetchDataModelRejectedAction,
  saveDataModel: DataModelingActions.saveDataModelAction,
  saveDataModelFulfilled: DataModelingActions.saveDataModelFulfilledAction,
  saveDataModelRejected: DataModelingActions.saveDataModelRejectedAction,
  setDataModelFilePath: DataModelingActions.setDataModelFilePath,
};

const DatamodelingDispatchers: IDataModelingDispatchers = bindActionCreators<
  any,
  IDataModelingDispatchers
  >(actions, store.dispatch);

export default DatamodelingDispatchers;
