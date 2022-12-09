import { all, put, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';

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
