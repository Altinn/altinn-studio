import React from 'react';

import { screen } from '@testing-library/react';

import { ListComponent } from 'src/layout/List/ListComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const countries = [
  {
    Name: 'Norway',
    Population: 5,
    HighestMountain: 2469,
    FlagLink: '[Norwegian flag](https://www.worldometers.info/img/flags/no-flag.gif)',
  },
  {
    Name: 'Sweden',
    Population: 10,
    HighestMountain: 1738,
    FlagLink: '[Swedish flag](https://www.worldometers.info/img/flags/sw-flag.gif)',
  },
  {
    Name: 'Denmark',
    Population: 6,
    HighestMountain: 170,
    FlagLink: '[Danish flag](https://www.worldometers.info/img/flags/da-flag.gif)',
  },
  {
    Name: 'Germany',
    Population: 83,
    HighestMountain: 2962,
    FlagLink: '[German flag](https://www.worldometers.info/img/flags/gm-flag.gif)',
  },
  {
    Name: 'Spain',
    Population: 47,
    HighestMountain: 3718,
    FlagLink: '[Spanish flag](https://www.worldometers.info/img/flags/sp-flag.gif)',
  },
  {
    Name: 'France',
    Population: 67,
    HighestMountain: 4807,
    FlagLink: '[French flag](https://www.worldometers.info/img/flags/fr-flag.gif)',
  },
];

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'List'>> = {}) => {
  renderGenericComponentTest({
    type: 'List',
    renderer: (props) => <ListComponent {...props} />,
    component: {
      id: 'list-component-id',
      tableHeaders: {
        Name: 'Name',
        Population: 'Population',
        HighestMountain: 'HighestMountain',
        FlagLink: 'FlagLink',
      },
      sortableColumns: ['population', 'highestMountain'],
      pagination: { alternatives: [2, 5], default: 2 },
      dataListId: 'countries',
      ...component,
    },
    genericProps: {
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

  it('should render rows that is sent in but not rows that is not sent in', () => {
    render();
    expect(screen.getByText('Norway')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.queryByText('Italy')).not.toBeInTheDocument();
  });

  it('should render columns as markup', async () => {
    render();

    expect(screen.getByRole('link', { name: /Norwegian flag/ })).toBeInTheDocument();
  });
});
