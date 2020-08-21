import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchAddActiveFormContainerSaga,
  watchAddApplicationMetadataSaga,
  watchAddFormComponentSaga,
  watchAddFormContainerSaga,
  watchDeleteApplicationMetadataSaga,
  watchDeleteFormComponentSaga,
  watchDeleteFormContainerSaga,
  watchFetchFormLayoutSaga,
  watchSaveFormLayoutSaga,
  watchUpdateApplicationMetadataSaga,
  watchUpdateDataModelBindingSaga,
  watchUpdateFormComponentOrderSaga,
  watchUpdateFormComponentSaga,
  watchUpdateContainerIdSaga,
  watchUpdateContainerSaga } from './formDesignerSagas';

// tslint:disable-next-line:space-before-function-paren
export default function* (): SagaIterator {
  yield fork(watchAddFormComponentSaga);
  yield fork(watchAddFormContainerSaga);
  yield fork(watchAddActiveFormContainerSaga);
  yield fork(watchDeleteFormComponentSaga);
  yield fork(watchDeleteFormContainerSaga);
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchSaveFormLayoutSaga);
  yield fork(watchUpdateDataModelBindingSaga);
  yield fork(watchUpdateFormComponentSaga);
  yield fork(watchUpdateFormComponentOrderSaga);
  yield fork(watchAddApplicationMetadataSaga);
  yield fork(watchDeleteApplicationMetadataSaga);
  yield fork(watchUpdateApplicationMetadataSaga);
  yield fork(watchUpdateContainerSaga);
  yield fork(watchUpdateContainerIdSaga);
}
