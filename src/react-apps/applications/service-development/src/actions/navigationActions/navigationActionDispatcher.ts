import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as NavigationActions from './actions';

export interface INavigationActionDispatchers extends ActionCreatorsMapObject {
  toggleDrawer: () => Action;
  toggleDrawerFulfilled: () => Action;
  toggleDrawerRejected: (error: Error) => NavigationActions.IToggleDrawerActionRejected;
}

const actions: INavigationActionDispatchers = {
  toggleDrawer: NavigationActions.toggleDrawerAction,
  toggleDrawerFulfilled: NavigationActions.toggleDrawerAction,
  toggleDrawerRejected: NavigationActions.toggleDrawerActionRejected,
};

const NavigationActionDispatchers: INavigationActionDispatchers = bindActionCreators<
  any,
  INavigationActionDispatchers
  >(actions, store.dispatch);

export default NavigationActionDispatchers;
