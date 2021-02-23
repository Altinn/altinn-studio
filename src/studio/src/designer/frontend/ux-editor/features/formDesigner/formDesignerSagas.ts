import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchAddActiveFormContainerSaga,
  watchDeleteActiveListSaga } from './activeList/activeListSagas';
import { watchAddApplicationMetadataSaga,
  watchAddFormComponentSaga,
  watchAddFormContainerSaga,
  watchAddLayoutSaga,
  watchDeleteApplicationMetadataSaga,
  watchDeleteFormComponentSaga,
  watchDeleteFormContainerSaga,
  watchDeleteLayoutSaga,
  watchFetchFormLayoutSaga,
  watchFetchFormLayoutSettingSaga,
  watchSaveFormLayoutSaga,
  watchSaveFormLayoutSettingSaga,
  watchUpdateApplicationMetadataSaga,
  watchUpdateFormComponentSaga,
  watchUpdateLayoutNameSaga } from './formLayout/formLayoutSagas';
import { watchAddWidgetSaga } from './widgets/addWidgetsSagas';

export default function* formDesignerSagas(): SagaIterator {
  yield fork(watchAddActiveFormContainerSaga);
  yield fork(watchDeleteActiveListSaga);
  yield fork(watchAddApplicationMetadataSaga);
  yield fork(watchAddFormComponentSaga);
  yield fork(watchAddFormContainerSaga);
  yield fork(watchAddLayoutSaga);
  yield fork(watchDeleteApplicationMetadataSaga);
  yield fork(watchDeleteFormComponentSaga);
  yield fork(watchDeleteFormContainerSaga);
  yield fork(watchDeleteLayoutSaga);
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchFetchFormLayoutSettingSaga);
  yield fork(watchSaveFormLayoutSaga);
  yield fork(watchSaveFormLayoutSettingSaga);
  yield fork(watchUpdateApplicationMetadataSaga);
  yield fork(watchUpdateFormComponentSaga);
  yield fork(watchUpdateLayoutNameSaga);
  yield fork(watchAddWidgetSaga);
}
