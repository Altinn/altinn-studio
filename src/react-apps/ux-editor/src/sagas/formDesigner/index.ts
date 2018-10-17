import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddFormComponentSaga,
  watchAddFormContainerSaga,
  watchAddActiveFormContainerSaga,
  watchDeleteFormComponentSaga,
  watchDeleteFormContainerSaga,
  watchFetchFormLayoutSaga,
  watchGenerateRepeatingGroupsSaga,
  watchSaveFormLayoutSaga,
  watchUpdateDataModelBindingSaga,
  watchUpdateFormComponentSaga,
} from './formDesignerSagas';

export default function* (): SagaIterator {
  yield fork(watchAddFormComponentSaga);
  yield fork(watchAddFormContainerSaga);
  yield fork(watchAddActiveFormContainerSaga);
  yield fork(watchDeleteFormComponentSaga);
  yield fork(watchDeleteFormContainerSaga);
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchGenerateRepeatingGroupsSaga);
  yield fork(watchSaveFormLayoutSaga);
  yield fork(watchUpdateDataModelBindingSaga);
  yield fork(watchUpdateFormComponentSaga);
}
