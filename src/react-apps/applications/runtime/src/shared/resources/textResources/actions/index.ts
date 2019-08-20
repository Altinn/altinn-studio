import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import * as Actions from './fetch';

import { ITextResource } from 'src/types/global';
import { store } from '../../../../store';

export interface ITextResourcesActions extends ActionCreatorsMapObject {
  fetchTextResources: () => Action;
  fetchTextResourcesFulfilled: (language: string, resources: ITextResource[]) => Actions.IFetchTextResourcesFulfilled;
  fetchTextResourcesRejected: (error: Error) => Actions.IFetchTextResourcesRejected;
}

const actions: ITextResourcesActions = {
  fetchTextResources: Actions.fetchTextResources,
  fetchTextResourcesFulfilled: Actions.fetchFormResourceFulfilled,
  fetchTextResourcesRejected: Actions.fetchFormResourceRejected,
};

const TextResourcesActions = bindActionCreators(actions, store.dispatch);

export default TextResourcesActions;
