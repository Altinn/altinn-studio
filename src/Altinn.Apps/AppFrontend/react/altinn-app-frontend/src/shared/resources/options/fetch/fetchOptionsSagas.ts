import { SagaIterator } from 'redux-saga';
import { fork, call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState, IOption, IMapping } from 'src/types';
import { ILayouts } from 'src/features/form/layout';
import { get } from 'altinn-shared/utils';
import { getOptionsUrl, jsonToQueryParams } from '../../../../utils/urlHelper';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import * as fetchOptionActionTypes from './fetchOptionsActionTypes';
import OptionsActions from '../optionsActions';
import { IFormData } from 'src/features/form/data/formDataReducer';
import { mapFormData } from 'src/utils/databindings';

const formLayoutSelector = (state: IRuntimeState): ILayouts =>
  state.formLayout.layouts;
const formDataSelector = (state: IRuntimeState) => state.formData.formData;

export function* fetchOptionsSaga(): SagaIterator {
  try {
    const layouts: ILayouts = yield select(formLayoutSelector);
    const formData = yield select(formDataSelector);

    const fetchedOptions: string[] = [];
    for (const layoutId of Object.keys(layouts)) {
      for (const element of layouts[layoutId]) {
        const component = element as any;

        if (
          component.optionsId &&
          fetchedOptions.indexOf(component.optionsId) === -1
        ) {
          yield fork(fetchSpecificOptionSaga, {
            optionsId: component.optionsId,
            formData,
            dataMapping: component?.mapping,
          });
          fetchedOptions.push(component.optionsId);
        }
      }
    }
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

interface IfetchSpecificOptionSaga {
  optionsId: string;
  formData: IFormData;
  dataMapping?: IMapping;
}

export function* fetchSpecificOptionSaga({
  optionsId,
  formData,
  dataMapping,
}: IfetchSpecificOptionSaga): SagaIterator {
  try {
    let url = getOptionsUrl(optionsId);

    if (dataMapping) {
      const mapped = mapFormData(formData, dataMapping);
      const queryParams = jsonToQueryParams(mapped);

      url += queryParams;
    }

    const options: IOption[] = yield call(get, url);
    yield call(OptionsActions.fetchOptionsFulfilled, optionsId, options);
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

export function* watchInitialFetchOptionSaga(): SagaIterator {
  yield takeLatest(
    FormLayoutActions.fetchLayoutFulfilled,
    OptionsActions.fetchOptions,
  );
}

export function* watchFetchOptionsSaga(): SagaIterator {
  yield takeLatest(fetchOptionActionTypes.FETCH_OPTIONS, fetchOptionsSaga);
}
