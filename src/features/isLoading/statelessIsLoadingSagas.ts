import { all, put, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { DataModelActions } from 'src/features/datamodel/datamodelSlice';
import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormRulesActions } from 'src/features/formRules/rulesSlice';
import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { QueueActions } from 'src/features/queue/queueSlice';

export function* watcherFinishStatelessIsLoadingSaga(): SagaIterator {
  yield take(QueueActions.startInitialStatelessQueue);
  yield all([
    take(FormDataActions.fetchFulfilled),
    take(FormLayoutActions.fetchFulfilled),
    take(FormLayoutActions.fetchSettingsFulfilled),
    take(DataModelActions.fetchJsonSchemaFulfilled),
    take(FormRulesActions.fetchFulfilled),
    take(FormDynamicsActions.fetchFulfilled),
  ]);
  yield put(IsLoadingActions.finishStatelessIsLoading());
}
