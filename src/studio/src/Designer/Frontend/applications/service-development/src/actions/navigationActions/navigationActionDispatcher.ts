import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as NavigationActions from './actions';

export interface INavigationActionDispatchers extends ActionCreatorsMapObject {
  toggleDrawer: () => Action;
}

const actions: INavigationActionDispatchers = {
  toggleDrawer: NavigationActions.toggleDrawerAction,
};

const NavigationActionDispatchers: INavigationActionDispatchers = bindActionCreators<
  any,
  INavigationActionDispatchers
  >(actions, store.dispatch);

export default NavigationActionDispatchers;
