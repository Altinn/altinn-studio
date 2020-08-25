import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { ITextResource } from 'src/types';
import * as FetchActions from './fetch/fetchTextResourcesActions';
import * as ReplaceActions from './replace/replaceTextResoucesActions';

import { store } from '../../redux/store';

export interface ITextResourcesActions extends ActionCreatorsMapObject {
  fetchTextResources: () => Action;
  fetchTextResourcesFulfilled:
    (language: string, resources: ITextResource[]) => FetchActions.IFetchTextResourcesFulfilled;
  fetchTextResourcesRejected: (error: Error) => FetchActions.IFetchTextResourcesRejected;
  replaceTextResources: () => Action;
  replaceTextResourcesFulfilled:
    (language: string, resources: ITextResource[]) => ReplaceActions.IReplaceTextResourcesFulfilled;
  replaceTextResourcesRejected: (error: Error) => ReplaceActions.IReplaceTextResourcesRejected;
}

const actions: ITextResourcesActions = {
  fetchTextResources: FetchActions.fetchTextResources,
  fetchTextResourcesFulfilled: FetchActions.fetchFormResourceFulfilled,
  fetchTextResourcesRejected: FetchActions.fetchFormResourceRejected,
  replaceTextResources: ReplaceActions.replaceTextResources,
  replaceTextResourcesFulfilled: ReplaceActions.replaceFormResourceFulfilled,
  replaceTextResourcesRejected: ReplaceActions.replaceFormResourceRejected,
};

const TextResourcesActions = bindActionCreators(actions, store.dispatch);

export default TextResourcesActions;
