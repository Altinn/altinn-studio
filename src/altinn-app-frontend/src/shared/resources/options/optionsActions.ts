import { bindActionCreators } from "redux";
import { store } from "src/store";

import * as FetchOptions from "./fetch/fetchOptionsActions";

export type IOptionsActions = typeof actions;

const actions = {
  fetchOptions: FetchOptions.fetchOptions,
  fetchingOptions: FetchOptions.fetchingOptions,
  fetchOptionsFulfilled: FetchOptions.fetchOptionsFulfilled,
  fetchOptionsRejected: FetchOptions.fetchOptionsRejected,
};

const optionsActions: IOptionsActions = bindActionCreators<any, any>(
  actions,
  store.dispatch
);

export default optionsActions;
