import { SortDirection } from '@altinn/altinn-design-system';

import type { IDataListsState } from '.';

import slice, { DataListsActions } from 'src/shared/resources/dataLists/dataListsSlice';
const countries = [
  { Name: 'Norway', Population: 5, HighestMountain: 2469 },
  { Name: 'Sweden', Population: 10, HighestMountain: 1738 },
  { Name: 'Denmark', Population: 6, HighestMountain: 170 },
  { Name: 'Germany', Population: 83, HighestMountain: 2962 },
  { Name: 'Spain', Population: 47, HighestMountain: 3718 },
  { Name: 'France', Population: 67, HighestMountain: 4807 },
];
export const testState: IDataListsState = {
  dataLists: {
    ['countries']: {
      listItems: countries,
      id: 'countries',
      loading: true,
      sortColumn: 'HighestMountain',
      sortDirection: SortDirection.Ascending,
      size: 10,
      pageNumber: 0,
    },
  },
  dataListsWithIndexIndicator: [],
  error: null,
};

describe('languageSlice', () => {
  let state: IDataListsState;
  beforeEach(() => {
    state = testState;
  });

  it('handles fetchLanguageFulfilled action', () => {
    const nextState = slice.reducer(
      state,
      DataListsActions.fetchFulfilled({
        key: 'countries',
        dataLists: countries,
        metadata: null,
      }),
    );
    expect(nextState.dataLists['countries'].loading).toBe(false);
    expect(nextState.dataLists['countries'].listItems[0].Name).toBe('Norway');
    expect(nextState.dataLists['countries'].listItems[0].Name).not.toBe('Italy');
    expect(nextState.error).toBeNull();
  });

  it('handles fetchLanguageRejected action', () => {
    const errorMessage = 'This is an error';
    const nextState = slice.reducer(
      state,
      DataListsActions.fetchRejected({
        key: 'countries',
        error: new Error(errorMessage),
      }),
    );
    expect(nextState.dataLists['countries'].loading).toBe(false);
    expect(nextState.error?.message).toEqual(errorMessage);
  });

  it('Check if the sort values is changed to the right values in the dataListState when setSort is called', () => {
    const nextState = slice.reducer(
      state,
      DataListsActions.setSort({ key: 'countries', sortColumn: 'Population', sortDirection: SortDirection.Descending }),
    );
    expect(nextState.dataLists['countries'].sortColumn).toBe('Population');
    expect(nextState.dataLists['countries'].sortDirection).toBe(SortDirection.Descending);
  });

  it('Check if the size and pageNumber is changed to the right values in the dataListState when setPageSize is called', () => {
    const nextState = slice.reducer(state, DataListsActions.setPageSize({ key: 'countries', size: 5 }));
    expect(nextState.dataLists['countries'].size).toBe(5);
    expect(nextState.dataLists['countries'].pageNumber).toBe(0);
  });

  it('Check if pageNumber is changed to the right value in the dataListState when setPageNumber is called', () => {
    const nextState = slice.reducer(state, DataListsActions.setPageNumber({ key: 'countries', pageNumber: 2 }));
    expect(nextState.dataLists['countries'].pageNumber).toBe(2);
  });
});
