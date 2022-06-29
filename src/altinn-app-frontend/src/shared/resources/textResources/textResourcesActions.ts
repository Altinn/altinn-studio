import { bindActionCreators } from 'redux';
import * as FetchActions from './fetch/fetchTextResourcesActions';
import * as ReplaceActions from './replace/replaceTextResoucesActions';

import { store } from 'src/store';

export type ITextResourcesActions = typeof actions;

const actions = {
  fetchTextResources: FetchActions.fetchTextResources,
  fetchTextResourcesFulfilled: FetchActions.fetchFormResourceFulfilled,
  fetchTextResourcesRejected: FetchActions.fetchFormResourceRejected,
  replaceTextResources: ReplaceActions.replaceTextResources,
  replaceTextResourcesFulfilled: ReplaceActions.replaceFormResourceFulfilled,
  replaceTextResourcesRejected: ReplaceActions.replaceFormResourceRejected,
};

const TextResourcesActions = bindActionCreators(actions, store.dispatch);

export default TextResourcesActions;
