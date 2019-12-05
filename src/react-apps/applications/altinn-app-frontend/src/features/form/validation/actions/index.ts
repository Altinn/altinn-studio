import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';
import { IComponentValidations, IValidations } from '../../../../types/global';
import * as ComponentValidation from './componentValidations';
import * as SingleFieldValidationActions from './singleFieldValidation';
import * as Validations from './validations';

export interface IFormValidationActions extends ActionCreatorsMapObject {
  updateValidations: (validations: IValidations) => Validations.IUpdateValidations;
  updateComponentValidations: (validations: IComponentValidations, componentId: string) =>
    ComponentValidation.IUpdateComponentValidations;
  updateComponentValidationsFulfilled: () => Action;
  updateComponentValidationsRejected: (error: Error) => ComponentValidation.IUpdateComponentValidationsRejected;
  runSingleFieldValidation: (url: string, dataModelBinding?: string)
    => SingleFieldValidationActions.IRunSingleFieldValidationAction;
  runSingleFieldValidationFulfilled: (validationErrors: any)
    => SingleFieldValidationActions.IRunSingleFieldValidationActionFulfilled;
  runSingleFieldValidationRejected: (error: Error)
    => SingleFieldValidationActions.IRunSingleFieldValidationActionRejected;
}

const actions: IFormValidationActions = {
  updateValidations: Validations.updateValidations,
  updateComponentValidations: ComponentValidation.updateComponentValidations,
  updateComponentValidationsFulfilled: ComponentValidation.updateComponentValidationsFulfilled,
  updateComponentValidationsRejected: ComponentValidation.updateComponentValidationsRejected,
  runSingleFieldValidation: SingleFieldValidationActions.runSingleFieldValidationAction,
  runSingleFieldValidationFulfilled: SingleFieldValidationActions.runSingleFieldValidationActionFulfilled,
  runSingleFieldValidationRejected: SingleFieldValidationActions.runSingleFieldValidationActionRejected,
};

const FormValidationActions: IFormValidationActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormValidationActions;
