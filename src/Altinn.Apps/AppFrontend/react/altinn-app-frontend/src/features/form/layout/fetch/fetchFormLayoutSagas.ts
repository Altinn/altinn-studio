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
import { ILayoutComponent, ILayoutGroup, ILayouts } from '../index';

const formDataSelector = (state: IRuntimeState) => state.formData;

function* fetchFormLayoutSaga({ url }: IFetchFormLayout): SagaIterator {
  try {
    const layoutResponse: any = yield call(get, url);
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    let autoSave: boolean;
    let firstLayoutKey: string;
    let repeatingGroups = {};

    if (layoutResponse.data) {
      layouts.FormLayout = layoutResponse.data.layout;
      firstLayoutKey = 'FormLayout';
      autoSave = layoutResponse.data.autoSave;
    } else {
      const formDataState: IFormDataState = yield select(formDataSelector);
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();
      firstLayoutKey = orderedLayoutKeys[0];

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = layoutResponse[key].data.layout;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
        repeatingGroups = {
          ...repeatingGroups,
          ...getRepeatingGroups(layouts[key] as [ILayoutComponent|ILayoutGroup], formDataState.formData),
        };
      });
    }

    yield call(Actions.fetchFormLayoutFulfilled, layouts, navigationConfig);
    yield call(Actions.updateAutoSave, autoSave);
    yield call(Actions.updateRepeatingGroupsFulfilled, repeatingGroups);
    yield call(Actions.updateCurrentView, firstLayoutKey);
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
