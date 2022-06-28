import { bindActionCreators } from "redux";
import { store } from "src/store";
import * as InstantiateActions from "./instantiate";

export type IInstantiationActions = typeof actions;

const actions = {
  instantiate: InstantiateActions.instantiate,
  instantiateFulfilled: InstantiateActions.instantiateFulfilled,
  instantiateRejected: InstantiateActions.instantiateRejected,
  instantiateToggle: InstantiateActions.instantiateToggle,
};

const InstantiationActions: IInstantiationActions = bindActionCreators(
  actions,
  store.dispatch
);
export default InstantiationActions;
