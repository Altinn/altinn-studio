import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { ServicesOverview } from '../../../src/dashboardServices/serviceOverview/servicesOverview';

describe('>>> components/base/serviceOverview.tsx --- Snapshot', () => {
  let mockStore: any;
  let mockStoreFull: any;
  const initialStateWithServices = {
    language: {
      language: {
      },
    },
    dashboard: {
      services: [
        {
          description:
            'Dette er en test, dette er en veldig veldig lang test, fordi vi prøver å se om det har noen betydning',
          full_name: 'SecondOrg/Second',
          name: 'Second',
          owner: {
            full_name: 'This is the full name of this org',
            login: 'SecondOrg',
            UserType: 2,
          },
          permissions: {
            pull: true,
          },
          updated_at: '2018-11-13T07:35:40Z',
        },
        {
          description:
            'Dette er en test, dette er en veldig veldig lang test, fordi vi prøver å se om det har noen betydning',
          full_name: 'ThirdOrg/Third',
          name: 'Third',
          owner: {
            full_name: 'This is the full name of this org',
            login: 'ThirdOrg',
            UserType: 2,
          },
          permissions: {
            pull: true,
          },
          updated_at: '2018-11-13T07:35:40Z',
        },
        {
          description:
            'Dette er en test, dette er en veldig veldig lang test, fordi vi prøver å se om det har noen betydning',
          full_name: 'ForthOrg/Forth',
          name: 'Forth',
          owner: {
            full_name: 'This is the full name of this org',
            login: 'ForthOrg',
            UserType: 2,
          },
          permissions: {
            pull: true,
          },
          updated_at: '2018-11-13T07:35:40Z',
        },
      ] as any[],
      user: {
        full_name: 'Mons Monsen',
        login: 'mons',
      },
      organizations: [] as any[],
    },
  };

  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      language: {
        language: {
        },
      },
      dashboard: {
        services: [] as any[],
        user: {
          full_name: 'Mons Monsen',
          login: 'mons',
        },
        organizations: [] as any[],
      },
    };
    mockStore = createStore(initialState);
    mockStoreFull = createStore(initialStateWithServices);
  });

  it('+++ Should match snapshot when empty', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <ServicesOverview
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStoreFull}>
        <ServicesOverview
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });
});
