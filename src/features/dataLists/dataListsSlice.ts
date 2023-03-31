import { fetchDataListsSaga, watchFinishedLoadingSaga } from 'src/features/dataLists/fetchDataListsSaga';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IDataListsState,
  IFetchDataListsFulfilledAction,
  IFetchDataListsRejectedAction,
  IFetchingDataListsAction,
  ISetDataLists,
  ISetDataListsPageNumber,
  ISetDataListsPageSize,
  ISetDataListsWithIndexIndicators,
  ISetSort,
} from 'src/features/dataLists/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IDataListsState = {
  dataLists: {},
  dataListsWithIndexIndicator: [],
  error: null,
  dataListCount: 0,
  dataListLoadedCount: 0,
  loading: true,
};

export let DataListsActions: ActionsFromSlice<typeof dataListsSlice>;
export const dataListsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IDataListsState>) => ({
    name: 'dataListState',
    initialState,
    extraSagas: [watchFinishedLoadingSaga],
    actions: {
      fetch: mkAction<void>({
        takeEvery: fetchDataListsSaga,
      }),
      loaded: mkAction<void>({
        reducer: (state) => {
          state.loading = false;
        },
      }),
      fetchFulfilled: mkAction<IFetchDataListsFulfilledAction>({
        reducer: (state, action) => {
          const { key, dataLists, metadata } = action.payload;
          state.dataLists[key].loading = false;
          state.dataLists[key].listItems = dataLists;
          state.dataLists[key].paginationData = metadata;
        },
      }),
      fetchRejected: mkAction<IFetchDataListsRejectedAction>({
        reducer: (state, action) => {
          const { key, error } = action.payload;
          state.dataLists[key].loading = false;
          state.error = error;
        },
      }),
      fetching: mkAction<IFetchingDataListsAction>({
        reducer: (state, action) => {
          const { key, metaData } = action.payload;
          state.dataLists[key] = {
            ...(state.dataLists[key] || {}),
            ...metaData,
            loading: true,
          };
        },
      }),
      setDataListsWithIndexIndicators: mkAction<ISetDataListsWithIndexIndicators>({
        reducer: (state, action) => {
          const { dataListsWithIndexIndicators } = action.payload;
          state.dataListsWithIndexIndicator = dataListsWithIndexIndicators;
        },
      }),
      setDataList: mkAction<ISetDataLists>({
        reducer: (state, action) => {
          const { dataLists } = action.payload;
          state.dataLists = dataLists;
        },
      }),
      setPageSize: mkAction<ISetDataListsPageSize>({
        takeLatest: fetchDataListsSaga,
        reducer: (state, action) => {
          const { key, size } = action.payload;
          state.dataLists[key].size = size;
          state.dataLists[key].pageNumber = 0;
        },
      }),
      setPageNumber: mkAction<ISetDataListsPageNumber>({
        takeLatest: fetchDataListsSaga,
        reducer: (state, action) => {
          const { key, pageNumber } = action.payload;
          state.dataLists[key].pageNumber = pageNumber;
        },
      }),
      setSort: mkAction<ISetSort>({
        takeLatest: fetchDataListsSaga,
        reducer: (state, action) => {
          const { key, sortColumn, sortDirection } = action.payload;
          state.dataLists[key].sortColumn = sortColumn;
          state.dataLists[key].sortDirection = sortDirection;
        },
      }),
    },
  }));

  DataListsActions = slice.actions;
  return slice;
};
