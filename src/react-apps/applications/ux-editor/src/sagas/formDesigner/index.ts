import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddActiveFormContainerSaga,
  watchAddApplicationMetadataSaga,
  watchAddFormComponentSaga,
  watchAddFormContainerSaga,
  watchCreateRepeatingGroupSaga,
  watchDeleteApplicationMetadataSaga,
  watchDeleteFormComponentSaga,
  watchDeleteFormContainerSaga,
  watchFetchFormLayoutSaga,
  watchSaveFormLayoutSaga,
  watchToggleFormContainerRepeatingSaga,
  watchUpdateApplicationMetadataSaga,
  watchUpdateDataModelBindingSaga,
  watchUpdateFormComponentOrderSaga,
  watchUpdateFormComponentSaga,
} from './formDesignerSagas';

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
  yield fork(watchToggleFormContainerRepeatingSaga);
  yield fork(watchCreateRepeatingGroupSaga);
  yield fork(watchUpdateFormComponentOrderSaga);
  yield fork(watchAddApplicationMetadataSaga);
  yield fork(watchDeleteApplicationMetadataSaga);
  yield fork(watchUpdateApplicationMetadataSaga);
}
