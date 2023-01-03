import React from 'react';

import { SortDirection } from '@altinn/altinn-design-system';
import { screen } from '@testing-library/react';
import type { PreloadedState } from 'redux';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { ListComponent } from 'src/layout/List/ListComponent';
import { mockComponentProps, renderWithProviders } from 'src/testUtils';
import type { IListProps } from 'src/layout/List/ListComponent';
import type { IDataListsState } from 'src/shared/resources/dataLists';
import type { RootState } from 'src/store';

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
      dataListId: 'countries',
      loading: true,
      sortColumn: 'HighestMountain',
      sortDirection: SortDirection.Ascending,
    },
  },
  dataListsWithIndexIndicator: [],
  error: null,
  dataListCount: 1,
  dataListLoadedCount: 1,
  loading: false,
};

const render = (props: Partial<IListProps> = {}, customState: PreloadedState<RootState> = {}) => {
  const allProps: IListProps = {
    ...mockComponentProps,
    dataListId: 'countries',
    tableHeaders: ['Name', 'Population', 'HighestMountain'],
    sortableColumns: ['Population', 'HighestMountain'],
    pagination: { alternatives: [2, 5], default: 2 },
    getTextResourceAsString: (value) => value,
    legend: () => <span>legend</span>,
    ...props,
  };

  renderWithProviders(<ListComponent {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      dataListState: {
        dataLists: {
          [allProps.id]: { listItems: countries, id: 'countries' },
        },
        error: {
          name: '',
          message: '',
        },
        dataListCount: 1,
        dataListLoadedCount: 1,
        loading: false,
      },
      ...customState,
    },
  });
};

describe('ListComponent', () => {
  jest.useFakeTimers();

  it('should render rows that is sent in but not rows that is not sent in', async () => {
    render({});
    expect(screen.getByText('Norway')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.queryByText('Italy')).not.toBeInTheDocument();
  });
});
