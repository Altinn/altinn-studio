import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddFormComponentSaga,
  watchDeleteFormComponentSaga,
  watchFetchFormLayoutSaga,
  watchSaveFormLayoutSaga,
  watchUpdateDataModelBindingSaga,
  watchUpdateFormComponentSaga
} from './formDesignerSagas';

export default function*(): SagaIterator {
  yield fork(watchAddFormComponentSaga);
  yield fork(watchDeleteFormComponentSaga);
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchSaveFormLayoutSaga);
  yield fork(watchUpdateDataModelBindingSaga);
  yield fork(watchUpdateFormComponentSaga);
}
