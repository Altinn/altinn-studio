import { all, call, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { mapFileUploaderWithTagSaga } from 'src/features/layout/fileUpload/mapFileUploaderWithTagSaga';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';

export function* watchMapFileUploaderWithTagSaga(): SagaIterator {
  yield all([take(FormLayoutActions.fetchFulfilled), take(AttachmentActions.mapAttachmentsFulfilled)]);
  yield call(mapFileUploaderWithTagSaga);

  yield takeLatest(
    [AttachmentActions.mapAttachmentsFulfilled, FormLayoutActions.fetchFulfilled],
    mapFileUploaderWithTagSaga,
  );
}
