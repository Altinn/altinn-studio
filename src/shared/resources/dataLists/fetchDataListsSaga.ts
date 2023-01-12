import { SortDirection } from '@altinn/altinn-design-system';
import { call, fork, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { listStateSelector } from 'src/selectors/dataListStateSelector';
import { DataListsActions } from 'src/shared/resources/dataLists/dataListsSlice';
import { getDataListLookupKey, getDataListLookupKeys } from 'src/utils/dataList';
import { selectNotNull } from 'src/utils/sagas';
import { get } from 'src/utils/sharedUtils';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';
import type { IFormData } from 'src/features/form/data';
import type { IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import type { ILayouts } from 'src/layout/layout';
import type {
  IDataList,
  IDataLists,
  IDataListsMetaData,
  IFetchSpecificDataListSaga,
} from 'src/shared/resources/dataLists/index';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';

export const formLayoutSelector = (state: IRuntimeState): ILayouts | null => state.formLayout?.layouts;
export const formDataSelector = (state: IRuntimeState) => state.formData.formData;
export const dataListsSelector = (state: IRuntimeState): IDataLists => state.dataListState.dataLists;
export const dataListsWithIndexIndicatorsSelector = (state: IRuntimeState) =>
  state.dataListState.dataListsWithIndexIndicator;
export const instanceIdSelector = (state: IRuntimeState): string | undefined => state.instanceData.instance?.id;
export const repeatingGroupsSelector = (state: IRuntimeState) => state.formLayout?.uiConfig.repeatingGroups;

export function* fetchDataListsSaga(): SagaIterator {
  const layouts: ILayouts = yield selectNotNull(formLayoutSelector);
  const repeatingGroups: IRepeatingGroups = yield selectNotNull(repeatingGroupsSelector);
  const fetchedDataLists: string[] = [];
  const dataListsWithIndexIndicators: IDataListsMetaData[] = [];
  let count = 0;
  for (const layoutId of Object.keys(layouts)) {
    for (const element of layouts[layoutId] || []) {
      if (element.type !== 'List' || !element.id) {
        continue;
      }

      const { secure, id, dataListId, pagination, mapping } = element;

      const { keys, keyWithIndexIndicator } = getDataListLookupKeys({
        id: id,
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
          count++;
          fetchedDataLists.push(lookupKey);
        }
      }
    }
  }
  yield put(DataListsActions.dataListCountFulfilled({ count }));
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
      id: id,
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

    const dataLists: IDataList = yield call(get, url);
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
