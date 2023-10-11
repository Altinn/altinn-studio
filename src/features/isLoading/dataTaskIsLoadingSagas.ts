import { all, put, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { QueueActions } from 'src/features/queue/queueSlice';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(QueueActions.startInitialDataTaskQueue);
    yield all([
      take(FormDataActions.fetchFulfilled),
      take(FormLayoutActions.fetchFulfilled),
      take(FormLayoutActions.fetchSettingsFulfilled),
      take(AttachmentActions.mapAttachmentsFulfilled),
    ]);

    yield put(IsLoadingActions.finishDataTaskIsLoading());
  }
}
