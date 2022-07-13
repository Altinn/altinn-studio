import type { SagaIterator } from 'redux-saga';
import { all, put, take } from 'redux-saga/effects';
import { FormDataActions } from '../../../../features/form/data/formDataSlice';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { finishDataTaskIsLoading } from '../isLoadingSlice';
import { startInitialDataTaskQueue } from '../../queue/queueSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(startInitialDataTaskQueue);
    yield all([
      take(FormDataActions.fetchFulfilled),
      take(FormLayoutActions.fetchFulfilled),
      take(FormLayoutActions.fetchSettingsFulfilled),
      take(FormRulesActions.fetchFulfilled),
      take(FormDynamicsActions.fetchFulfilled),
      take(AttachmentActions.mapAttachmentsFulfilled),
    ]);

    yield put(finishDataTaskIsLoading());
  }
}
