import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';

export interface IFormLayoutActions extends ActionCreatorsMapObject {}

const actions: IFormLayoutActions = {};
const FormLayoutActions: IFormLayoutActions = bindActionCreators<any, any>(actions, store.dispatch);
export default FormLayoutActions;