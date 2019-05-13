import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import * as ValidationActions from './componentValidations';
import * as SingleFieldValidationActions from './singleFieldValidation';

import { store } from '../../../../store';
import { IComponentValidations } from '../../../../types/global';

export interface IFormValidationActions extends ActionCreatorsMapObject {
  updateValidations: (validations: IComponentValidations) =>
    ValidationActions.IUpdateValidations;
  updateValidationsFulfilled: () => Action;
  updateValidationsRejected: (error: Error) => ValidationActions.IUpdateValidationsRejected;
  runSingleFieldValidation: (url: string, dataModelBinding?: string)
    => SingleFieldValidationActions.IRunSingleFieldValidationAction;
  runSingleFieldValidationFulfilled: (validationErrors: any)
    => SingleFieldValidationActions.IRunSingleFieldValidationActionFulfilled;
  runSingleFieldValidationRejected: (error: Error)
    => SingleFieldValidationActions.IRunSingleFieldValidationActionRejected;
}

const actions: IFormValidationActions = {
  updateValidations: ValidationActions.updateValidations,
  updateValidationsFulfilled: ValidationActions.updateValidationsFulfilled,
  updateValidationsRejected: ValidationActions.updateValidationsRejected,
  runSingleFieldValidation: SingleFieldValidationActions.runSingleFieldValidationAction,
  runSingleFieldValidationFulfilled: SingleFieldValidationActions.runSingleFieldValidationActionFulfilled,
  runSingleFieldValidationRejected: SingleFieldValidationActions.runSingleFieldValidationActionRejected,
};

export default bindActionCreators<any, IFormValidationActions>(actions, store.dispatch);
