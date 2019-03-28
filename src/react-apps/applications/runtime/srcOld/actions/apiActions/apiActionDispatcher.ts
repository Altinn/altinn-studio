import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ApiActions from './actions';

export interface IApiActionDispatchers extends ActionCreatorsMapObject {
  checkIfApiShouldFetch: (
    lastUpdatedComponentId: string,
    lastUpdatedDataBinding: IDataModelFieldElement,
    lastUpdatedDataValue: string,
    repeating: boolean,
    dataModelGroup?: string,
    index?: number,
  ) => ApiActions.ICheckIfApiShouldFetchAction;
  fetchApiListResponse: () => ApiActions.IFetchApiListResponseAction;
}

const actions: IApiActionDispatchers = {
  checkIfApiShouldFetch: ApiActions.checkIfApiShouldFetch,
  fetchApiListResponse: ApiActions.fetchApiListResponse,
};

const ApiActionDispatchers: IApiActionDispatchers = bindActionCreators<
  any,
  IApiActionDispatchers
>(actions, store.dispatch);

export default ApiActionDispatchers;
