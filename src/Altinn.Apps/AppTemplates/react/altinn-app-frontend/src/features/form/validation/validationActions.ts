import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IComponentValidations, IValidations } from 'src/types';
import { store } from '../../../redux/store';
import * as ComponentValidation from './component/componentValidationsActions';
import * as Validations from './update/updateValidationsActions';

export interface IFormValidationActions extends ActionCreatorsMapObject {
  updateValidations: (validations: IValidations) => Validations.IUpdateValidations;
  updateComponentValidations: (validations: IComponentValidations, componentId: string, invalidDataTypes?: string[]) =>
    ComponentValidation.IUpdateComponentValidations;
  updateComponentValidationsFulfilled: () => Action;
  updateComponentValidationsRejected: (error: Error) => ComponentValidation.IUpdateComponentValidationsRejected;
}

const actions: IFormValidationActions = {
  updateValidations: Validations.updateValidations,
  updateComponentValidations: ComponentValidation.updateComponentValidations,
  updateComponentValidationsFulfilled: ComponentValidation.updateComponentValidationsFulfilled,
  updateComponentValidationsRejected: ComponentValidation.updateComponentValidationsRejected,
};

const FormValidationActions: IFormValidationActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormValidationActions;
