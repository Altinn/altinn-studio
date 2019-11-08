import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import AttachmentDispatcher from './../../attachments/attachmentActions';
import InstanceDataActions from './../instanceDataActions';
import * as getInstanceDataActions from './getInstanceDataActions';
import * as InstanceDataActionTypes from './getInstanceDataActionTypes';

import { instancesControllerUrl } from './../../../../utils/urlHelper';

export function* getInstanceDataSaga({
  instanceOwner,
  instanceId,
}: getInstanceDataActions.IGetInstanceData ): SagaIterator {
  try {
    const url = `${instancesControllerUrl}/${instanceOwner}/${instanceId}`;
    const result = yield call(get, url);
    // yield call(InstanceDataActions.getInstanceDataFulfilled, result);
    console.log('#### result', result); // TODO: map to redux structre, filter out default

    if(result) {
      const attachments = result.data.filter((att) => att.elementType !== 'default');
      yield call(AttachmentDispatcher.fetchAttachmentsFulfilled, attachments);
    }

    yield call(InstanceDataActions.getInstanceDataFulfilled, result);
  } catch (err) {
    yield call(InstanceDataActions.getInstanceDataRejected, err);
  }
}

export function* watchGetInstanceDataSaga(): SagaIterator {
  yield takeLatest(
    InstanceDataActionTypes.GET_INSTANCEDATA,
    getInstanceDataSaga,
  );
}
