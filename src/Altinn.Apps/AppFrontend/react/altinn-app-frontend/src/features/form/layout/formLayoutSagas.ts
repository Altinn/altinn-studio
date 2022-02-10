import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchFormLayoutSaga, watchFetchFormLayoutSettingsSaga, watchFetchFormLayoutSetsSaga } from './fetch/fetchFormLayoutSagas';
import { watchUpdateFocusSaga, watchUpdateRepeatingGroupsSaga, watchUpdateCurrentViewSaga, watchCalculatePageOrderAndMoveToNextPageSaga, watchInitialCalculagePageOrderAndMoveToNextPageSaga, watchUpdateRepeatingGroupsEditIndexSaga, watchInitRepeatingGroupsSaga, watchUpdateFileUploaderWithTagEditIndexSaga, watchInitFileUploaderWithTagSaga, watchUpdateFileUploaderWithTagChosenOptionsSaga } from './update/updateFormLayoutSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchUpdateFocusSaga);
  yield fork(watchUpdateRepeatingGroupsSaga);
  yield fork(watchUpdateRepeatingGroupsEditIndexSaga);
  yield fork(watchUpdateFileUploaderWithTagEditIndexSaga);
  yield fork(watchUpdateFileUploaderWithTagChosenOptionsSaga);
  yield fork(watchInitRepeatingGroupsSaga);
  yield fork(watchInitFileUploaderWithTagSaga);
  yield fork(watchFetchFormLayoutSettingsSaga);
  yield fork(watchUpdateCurrentViewSaga);
  yield fork(watchFetchFormLayoutSetsSaga);
  yield fork(watchCalculatePageOrderAndMoveToNextPageSaga);
  yield fork(watchInitialCalculagePageOrderAndMoveToNextPageSaga);
}
