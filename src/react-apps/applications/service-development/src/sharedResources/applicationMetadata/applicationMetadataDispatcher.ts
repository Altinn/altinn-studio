import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as getApplicationMetadataActions from './get/getApplicationMetadataActions';
import * as putApplicationMetadataActions from './put/putApplicationMetaDataActions';

export interface IApplicationMetadataDispatcher extends ActionCreatorsMapObject {
  getApplicationMetadata: () => Action;
  // tslint:disable-next-line: max-line-length
  getApplicationMetadataFulfilled: (applicationMetadata: any) => getApplicationMetadataActions.IGetApplicationMetadataFulfilled;
  getApplicationMetadataRejected: (error: Error) => getApplicationMetadataActions.IGetApplicationMetadataRejected;
  putApplicationMetadata: (applicationMetadata: any) => putApplicationMetadataActions.IPutApplicationMetadata;
  // tslint:disable-next-line: max-line-length
  putApplicationMetadataFulfilled: (applicationMetadata: any) => putApplicationMetadataActions.IPutApplicationMetadataFulfilled;
  putApplicationMetadataRejected: (error: Error) => putApplicationMetadataActions.IPutApplicationMetadataRejected;
}

const actions: IApplicationMetadataDispatcher = {
  getApplicationMetadata: getApplicationMetadataActions.getApplicationMetadata,
  getApplicationMetadataFulfilled: getApplicationMetadataActions.getApplicationMetadataFulfilled,
  getApplicationMetadataRejected: getApplicationMetadataActions.getApplicationMetadataRejected,
  putApplicationMetadata: putApplicationMetadataActions.putApplicationMetadata,
  putApplicationMetadataFulfilled: putApplicationMetadataActions.putApplicationMetadataFulfilled,
  putApplicationMetadataRejected: putApplicationMetadataActions.putApplicationMetadataRejected,
};

export default bindActionCreators<IServiceDevelopmentState, IApplicationMetadataDispatcher>(actions, store.dispatch);
