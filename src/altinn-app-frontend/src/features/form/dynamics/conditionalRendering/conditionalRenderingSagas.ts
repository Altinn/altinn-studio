import { call, put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import type { IFormData } from 'src/features/form/data';
import type { IConditionalRenderingRules } from 'src/features/form/dynamics';
import type { IRuntimeState, IUiConfig, IValidations } from 'src/types';

export const ConditionalRenderingSelector: (store: IRuntimeState) => any = (
  store: IRuntimeState,
) => store.formDynamics.conditionalRendering;
export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) =>
  store.formData.formData;
export const UiConfigSelector: (store: IRuntimeState) => IUiConfig = (store) =>
  store.formLayout.uiConfig;
export const FormValidationSelector: (store: IRuntimeState) => IValidations = (
  store,
) => store.formValidations.validations;

export function* checkIfConditionalRulesShouldRunSaga(): SagaIterator {
  try {
    const conditionalRenderingState: IConditionalRenderingRules = yield select(
      ConditionalRenderingSelector,
    );
    const formData: IFormData = yield select(FormDataSelector);
    const formValidations: IValidations = yield select(FormValidationSelector);
    const uiConfig: IUiConfig = yield select(UiConfigSelector);
    const componentsToHide: string[] = runConditionalRenderingRules(
      conditionalRenderingState,
      formData,
      uiConfig.repeatingGroups,
    );

    if (shouldHiddenFieldsUpdate(uiConfig.hiddenFields, componentsToHide)) {
      yield put(FormLayoutActions.updateHiddenComponents({ componentsToHide }));
      componentsToHide.forEach((componentId) => {
        if (formValidations[componentId]) {
          const newFormValidations = formValidations;
          delete formValidations[componentId];
          ValidationActions.updateValidations({
            validations: newFormValidations,
          });
        }
      });
    }
  } catch (err) {
    yield call(console.error, err);
  }
}

function shouldHiddenFieldsUpdate(
  currentList: string[],
  newList: string[],
): boolean {
  if (!currentList || currentList.length !== newList.length) {
    return true;
  }

  if (!currentList && newList && newList.length > 0) {
    return true;
  }

  return !!currentList.find((element) => !newList.includes(element));
}
