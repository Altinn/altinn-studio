import type { SagaIterator } from 'redux-saga';
import { all, put, take } from 'redux-saga/effects';
import { FormDataActions } from '../../../../features/form/data/formDataSlice';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { IsLoadingActions } from '../isLoadingSlice';
import { QueueActions } from '../../queue/queueSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(QueueActions.startInitialDataTaskQueue);
    yield all([
      take(FormDataActions.fetchFulfilled),
      take(FormLayoutActions.fetchFulfilled),
      take(FormLayoutActions.fetchSettingsFulfilled),
      take(FormRulesActions.fetchFulfilled),
      take(FormDynamicsActions.fetchFulfilled),
      take(AttachmentActions.mapAttachmentsFulfilled),
    ]);

    yield put(IsLoadingActions.finishDataTaskIsLoading());
  }
}
