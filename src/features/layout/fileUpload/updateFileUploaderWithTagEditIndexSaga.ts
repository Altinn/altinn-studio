import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import type { IUpdateFileUploaderWithTagEditIndex } from 'src/features/layout/formLayoutTypes';
import type { IRuntimeState } from 'src/types';

export function* updateFileUploaderWithTagEditIndexSaga({
  payload: { componentId, baseComponentId, index, attachmentId },
}: PayloadAction<IUpdateFileUploaderWithTagEditIndex>): SagaIterator {
  try {
    if (attachmentId && index === -1) {
      // In the case of closing an edit view.
      const state: IRuntimeState = yield select();
      const chosenOption =
        state.formLayout.uiConfig.fileUploadersWithTag &&
        state.formLayout.uiConfig.fileUploadersWithTag[componentId]?.chosenOptions[attachmentId];
      if (chosenOption && chosenOption !== '') {
        yield put(
          FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({
            componentId,
            baseComponentId,
            index,
          }),
        );
      } else {
        yield put(
          FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({
            error: null,
          }),
        );
      }
    } else {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({
          componentId,
          baseComponentId,
          index,
        }),
      );
    }
  } catch (error) {
    yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({ error }));
  }
}
