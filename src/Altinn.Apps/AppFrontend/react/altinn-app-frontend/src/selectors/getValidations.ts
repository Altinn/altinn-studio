import { createSelector } from 'reselect';
import { IRuntimeState } from '../types';
import { IComponentValidations, IValidations } from '../types/global';

const validationErrorsSelector = (state: IRuntimeState) => {
  return state.formValidations.validations;
};

const componentValidationsSelector = (state: IRuntimeState, props: any) => {
  const componentValidations = state.formValidations.validations[props.id];
  return componentValidations;
};

const getValidations = () => {
  return createSelector(
    [validationErrorsSelector],
    (validationResults: IValidations) => {
      return validationResults;
    },
  );
};

const getComponentValidations = () => {
  return createSelector(
    [componentValidationsSelector],
    (componentValidations: IComponentValidations) => {
      return componentValidations;
    },
  );
};

export const makeGetValidationsSelector = getValidations;
export const makeGetComponentValidationsSelector = getComponentValidations;
