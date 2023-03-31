import { SortDirection } from '@altinn/altinn-design-system';
import { call, fork, put, race, select, take } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { DataListsActions } from 'src/features/dataLists/dataListsSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { listStateSelector } from 'src/selectors/dataListStateSelector';
import { getDataListLookupKey, getDataListLookupKeys } from 'src/utils/dataList';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { selectNotNull } from 'src/utils/sagas';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';
import type {
  IDataList,
  IDataLists,
  IDataListsMetaData,
  IFetchSpecificDataListSaga,
} from 'src/features/dataLists/index';
import type { IFormData } from 'src/features/formData';
import type { IUpdateFormDataFulfilled } from 'src/features/formData/formDataTypes';
import type { ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';

export const formLayoutSelector = (state: IRuntimeState): ILayouts | null => state.formLayout?.layouts;
export const formDataSelector = (state: IRuntimeState) => state.formData.formData;
export const dataListsSelector = (state: IRuntimeState): IDataLists => state.dataListState.dataLists;
export const instanceIdSelector = (state: IRuntimeState): string | undefined => state.instanceData.instance?.id;
export const repeatingGroupsSelector = (state: IRuntimeState) => state.formLayout?.uiConfig.repeatingGroups;

export function* watchFinishedLoadingSaga(): SagaIterator {
  let dataListCount = 0;
  let fulfilledCount = 0;
  while (true) {
    const [fetch, fulfilled] = yield race([take(DataListsActions.fetching), take(DataListsActions.fetchFulfilled)]);
    if (fetch) {
      dataListCount++;
    }
    if (fulfilled) {
      fulfilledCount++;
    }
    if (dataListCount === fulfilledCount) {
      yield put(DataListsActions.loaded());
    }
  }
}

export function* fetchDataListsSaga(): SagaIterator {
  const layouts: ILayouts = yield selectNotNull(formLayoutSelector);
  const repeatingGroups: IRepeatingGroups = yield selectNotNull(repeatingGroupsSelector);
  const fetchedDataLists: string[] = [];
  const dataListsWithIndexIndicators: IDataListsMetaData[] = [];
  for (const layoutId of Object.keys(layouts)) {
    for (const element of layouts[layoutId] || []) {
      if (element.type !== 'List' || !element.id) {
        continue;
      }

      const { secure, id, dataListId, pagination, mapping } = element;

      const { keys, keyWithIndexIndicator } = getDataListLookupKeys({
        id,
        secure,
        repeatingGroups,
        mapping,
      });
      if (keyWithIndexIndicator) {
        dataListsWithIndexIndicators.push(keyWithIndexIndicator);
      }

      if (!keys?.length) {
        continue;
      }

      for (const dataListsObject of keys) {
        const { id, mapping, secure } = dataListsObject;
        const lookupKey = getDataListLookupKey({ id, mapping });
        const paginationDefault = pagination ? pagination.default : 0;
        if (id && !fetchedDataLists.includes(lookupKey) && dataListId) {
          yield fork(fetchSpecificDataListSaga, {
            id,
            dataListId,
            dataMapping: mapping,
            secure,
            paginationDefaultValue: paginationDefault,
          });
          fetchedDataLists.push(lookupKey);
        }
      }
    }
  }
  if (fetchedDataLists.length == 0) {
    yield put(DataListsActions.loaded());
  }
  yield put(
    DataListsActions.setDataListsWithIndexIndicators({
      dataListsWithIndexIndicators,
    }),
  );
}

export function* fetchSpecificDataListSaga({
  id,
  dataMapping,
  secure,
  dataListId,
  paginationDefaultValue,
}: IFetchSpecificDataListSaga): SagaIterator {
  const instanceId = yield select(instanceIdSelector);
  try {
    const metaData: IDataListsMetaData = {
      id,
      mapping: dataMapping,
      secure,
      dataListId,
    };
    yield put(DataListsActions.fetching({ key: id, metaData }));
    const formData: IFormData = yield select(formDataSelector);
    const language = yield select(appLanguageStateSelector);
    const dataList = yield select(listStateSelector);
    const pageSize = dataList.dataLists[id].size ? dataList.dataLists[id].size.toString() : paginationDefaultValue;
    const pageNumber = dataList.dataLists[id].pageNumber ? dataList.dataLists[id].pageNumber.toString() : '0';
    const sortColumn = dataList.dataLists[id].sortColumn ? dataList.dataLists[id].sortColumn.toString() : null;
    const sortDirection = dataList.dataLists[id].sortDirection
      ? dataList.dataLists[id].sortDirection.toString()
      : SortDirection.NotActive;

    const url = getDataListsUrl({
      dataListId,
      formData,
      language,
      dataMapping,
      secure,
      instanceId,
      pageSize,
      pageNumber,
      sortColumn,
      sortDirection,
    });

    const dataLists: IDataList = yield call(httpGet, url);
    yield put(
      DataListsActions.fetchFulfilled({
        key: id,
        dataLists: dataLists.listItems,
        metadata: dataLists._metaData,
      }),
    );
  } catch (error) {
    yield put(DataListsActions.fetchRejected({ key: id, error }));
  }
}

export function* checkIfDataListShouldRefetchSaga({
  payload: { field },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  const dataList: IDataList = yield select(dataListsSelector);
  let foundInExistingDataList = false;
  for (const dataListKey of Object.keys(dataList)) {
    const { mapping, id, secure, dataListId } = dataList[dataListKey] || {};
    if (!id) {
      continue;
    }

    if (mapping && Object.keys(mapping).includes(field)) {
      foundInExistingDataList = true;
      yield fork(fetchSpecificDataListSaga, {
        id,
        dataListId,
        dataMapping: mapping,
        secure,
      });
    }
  }

  if (foundInExistingDataList) {
    return;
  }
}
