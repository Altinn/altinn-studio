import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';

import * as fetchActions from './fetch';

interface IFormDataModelActions extends ActionCreatorsMapObject {
  fetchDataModel: (url: string) => fetchActions.IFetchDataModel;
  fetchDataModelFulfilled: (dataModel: any) => fetchActions.IFetchDataModelFulfilled;
  fetchDataModelRejected: (error: Error) => fetchActions.IFetchDataModelRejected;
}

const actions: IFormDataModelActions = {
  fetchDataModel: fetchActions.fetchDataModel,
  fetchDataModelFulfilled: fetchActions.fetchDataModelFulfilled,
  fetchDataModelRejected: fetchActions.fetchDataModelRejected,
};

const DataModelActions: IFormDataModelActions = bindActionCreators<any, any>(actions, store.dispatch);

export default DataModelActions;
