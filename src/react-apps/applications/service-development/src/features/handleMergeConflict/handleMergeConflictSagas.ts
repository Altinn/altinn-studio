import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../shared/src/utils/networking';
import * as HandleMergeConflictActions from './handleMergeConflictActions';
import * as HandleMergeConclictActionTypes from './handleMergeConflictActionTypes';
import HandleMergeConflictDispatchers from './handleMergeConflictDispatcher';

// const mockResult = {
//   behindBy: 1,
//   aheadBy: 3,
//   contentStatus: [
//     {
//       filePath: 'Model/ServiceModel.cs',
//       fileStatus: 'ModifiedInWorkdir',
//     },
//     {
//       filePath: 'Resources/FormLayout.json',
//       fileStatus: 'Conflicted',
//     },
//     {
//       filePath: 'Resources/react-app.css',
//       fileStatus: 'ModifiedInWorkdir',
//     },
//   ],
//   repositoryStatus: 'MergeConflict',
//   hasMergeConflict: true,
// };

export function* handleMergeConflictSaga({
  url,
  org,
  repo,
}: HandleMergeConflictActions.IFetchRepoStatusAction): SagaIterator {
  try {
    // const result = mockResult;
    const result = yield call(get, url);

    yield call(HandleMergeConflictDispatchers.fetchRepoStatusFulfilled, result);
  } catch (err) {
    yield call(HandleMergeConflictDispatchers.fetchRepoStatusRejected, err);
  }
}

export function* watchHandleMergeConflictSaga(): SagaIterator {
  yield takeLatest(
    HandleMergeConclictActionTypes.FETCH_REPO_STATUS,
    handleMergeConflictSaga,
  );
}

// tslint:disable-next-line:space-before-function-paren
export default function* (): SagaIterator {
  yield fork(watchHandleMergeConflictSaga);
}
