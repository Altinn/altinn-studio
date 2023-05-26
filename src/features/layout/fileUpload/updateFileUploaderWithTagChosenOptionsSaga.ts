import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { getOptionLookupKey } from 'src/utils/options';
import type { IUpdateFileUploaderWithTagChosenOptions } from 'src/features/layout/formLayoutTypes';
import type { ILayoutCompFileUploadWithTag } from 'src/layout/FileUploadWithTag/types';
import type { IRuntimeState } from 'src/types';

export function* updateFileUploaderWithTagChosenOptionsSaga({
  payload: { componentId, baseComponentId, id, option },
}: PayloadAction<IUpdateFileUploaderWithTagChosenOptions>): SagaIterator {
  try {
    // Validate option to available options
    const state: IRuntimeState = yield select();
    const currentView = state.formLayout.uiConfig.currentView;
    const component =
      state.formLayout.layouts &&
      (state.formLayout.layouts[currentView]?.find((component) => component.id === baseComponentId) as
        | ILayoutCompFileUploadWithTag
        | undefined);
    const lookupKey =
      component &&
      getOptionLookupKey({
        id: component?.optionsId,
        mapping: component?.mapping,
      });
    const componentOptions = typeof lookupKey === 'string' && state.optionState.options[lookupKey]?.options;
    if (componentOptions && componentOptions.find((op) => op.value === option.value)) {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagChosenOptionsFulfilled({
          componentId,
          baseComponentId,
          id,
          option,
        }),
      );
    } else {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({
          error: new Error('Could not find the selected option!'),
        }),
      );
    }
  } catch (error) {
    yield put(
      FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({
        error,
      }),
    );
  }
}
