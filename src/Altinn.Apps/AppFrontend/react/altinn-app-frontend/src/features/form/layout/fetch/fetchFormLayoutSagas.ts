import { SagaIterator } from 'redux-saga';
import { call, all, take, select } from 'redux-saga/effects';
import { IAltinnWindow } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import Actions from '../formLayoutActions';
import { IFetchFormLayout } from './fetchFormLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import * as FormDataActionTypes from '../../data/formDataActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { getRepeatingGroups } from '../../../../utils/formLayout';
import { IRuntimeState } from '../../../../types';
import { IFormDataState } from '../../data/formDataReducer';

const formDataSelector = (state: IRuntimeState) => state.formData;

function* fetchFormLayoutSaga({ url }: IFetchFormLayout): SagaIterator {
  try {
    const { data }: any = yield call(get, url);
    const formDataState: IFormDataState = yield select(formDataSelector);
    const repeatingGroups = getRepeatingGroups(data.layout, formDataState.formData);
    yield call(
      Actions.fetchFormLayoutFulfilled,
      data.layout,
    );
    yield call(Actions.updateAutoSave, data.autoSave);
    yield call(Actions.updateRepeatingGroupsFulfilled, repeatingGroups);
  } catch (err) {
    yield call(Actions.fetchFormLayoutRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield all([
    take(ActionTypes.FETCH_FORM_LAYOUT),
    take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL),
    take(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED),
  ]);
  const { org, app } = window as Window as IAltinnWindow;
  const url = `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`;
  yield call(fetchFormLayoutSaga, { url } as IFetchFormLayout);
}
