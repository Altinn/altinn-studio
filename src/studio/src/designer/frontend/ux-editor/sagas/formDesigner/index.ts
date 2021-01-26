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
  watchUpdateContainerSaga,
  watchUpdateSelectedLayoutSaga,
  watchDeleteLayoutSaga,
  watchAddLayoutSaga,
  watchUpdateLayoutNameSaga,
  watchUpdateLayoutOrderSaga,
  watchFetchFormLayoutSettingSaga,
  watchSaveFormLayoutSettingSaga } from './formDesignerSagas';
import { watchAddWidgetSaga } from '../../features/formLayout/widgets/addWidgetsSagas';

// eslint-disable-next-line func-names
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
  yield fork(watchUpdateSelectedLayoutSaga);
  yield fork(watchDeleteLayoutSaga);
  yield fork(watchAddLayoutSaga);
  yield fork(watchUpdateLayoutNameSaga);
  yield fork(watchUpdateLayoutOrderSaga);
  yield fork(watchFetchFormLayoutSettingSaga);
  yield fork(watchSaveFormLayoutSettingSaga);
  yield fork(watchAddWidgetSaga);
}
