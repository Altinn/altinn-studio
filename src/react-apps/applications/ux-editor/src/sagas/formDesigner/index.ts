import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddActiveFormContainerSaga,
  watchAddFormComponentSaga,
  watchAddFormContainerSaga,
  watchDeleteFormComponentSaga,
  watchDeleteFormContainerSaga,
  watchFetchFormLayoutSaga,
  watchGenerateRepeatingGroupsSaga,
  watchSaveFormLayoutSaga,
  watchToggleFormContainerRepeatingSaga,
  watchUpdateDataModelBindingSaga,
  watchUpdateFormComponentSaga,
} from './formDesignerSagas';

export default function*(): SagaIterator {
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
  yield fork(watchToggleFormContainerRepeatingSaga);
}
