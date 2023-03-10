import React from 'react';

import { screen } from '@testing-library/react';

import { ListComponent } from 'src/layout/List/ListComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const countries = [
  { Name: 'Norway', Population: 5, HighestMountain: 2469 },
  { Name: 'Sweden', Population: 10, HighestMountain: 1738 },
  { Name: 'Denmark', Population: 6, HighestMountain: 170 },
  { Name: 'Germany', Population: 83, HighestMountain: 2962 },
  { Name: 'Spain', Population: 47, HighestMountain: 3718 },
  { Name: 'France', Population: 67, HighestMountain: 4807 },
];

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'List'>> = {}) => {
  renderGenericComponentTest({
    type: 'List',
    renderer: (props) => <ListComponent {...props} />,
    component: {
      id: 'list-component-id',
      tableHeaders: { Name: 'Name', Population: 'Population', HighestMountain: 'HighestMountain' },
      sortableColumns: ['population', 'highestMountain'],
      pagination: { alternatives: [2, 5], default: 2 },
      dataListId: 'countries',
      ...component,
    },
    genericProps: {
      getTextResourceAsString: (value) => value,
      legend: () => <span>legend</span>,
      ...genericProps,
    },
    manipulateState: (state) => {
      state.dataListState = {
        dataLists: {
          ['list-component-id']: { listItems: countries, id: 'countries' },
        },
        error: {
          name: '',
          message: '',
        },
        dataListCount: 1,
        dataListLoadedCount: 1,
        loading: false,
      };
    },
  });
};

describe('ListComponent', () => {
  jest.useFakeTimers();

  it('should render rows that is sent in but not rows that is not sent in', async () => {
    render();
    expect(screen.getByText('Norway')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.queryByText('Italy')).not.toBeInTheDocument();
  });
});
