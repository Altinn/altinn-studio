
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { IRepository } from '../../../../shared/types';
import { getListOfServicesExcludingDatamodels, ServicesOverview } from '../../../features/serviceOverview/servicesOverview';

describe('>>> features/serviceOverview', () => {
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      dashboard: {
        user: {
          full_name: 'Ulf Utvikler',
        },
        services: [
          {
            name: 'testService',
            description: '',
            owner: { full_name: 'Ulf Utvikler' },
            permissions: {
              push: true,
            },
          },
          {
            name: 'NullSkatt',
            description: '',
            owner: { full_name: 'Ulf Utvikler' },
            permissions: {
              push: true,
            },
          },
        ],
      },
      language: {
        language: {
          dashboard: {
            main_header: 'Tjenesteoversikt',
            known_issues_subheader: 'known_issues_subheader',
            known_issues_link: 'known_issues_link',
            main_subheader: 'main_subheader',
          },
        },
      },
    };

    mockStore = createStore(initialState);
  });

  it('>>> Capture snapshot of serviceOverview', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <ServicesOverview />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ if there are no services getListOfServicesExcludingDatamodels should return null', () => {
    const services = getListOfServicesExcludingDatamodels(null);
    expect(services).toEqual(undefined);
  });

  it('+++ if there are services getListOfServicesExcludingDatamodels should return services without datamodels', () => {
    const serviceList: IRepository[] = [
      {
        name: 'testService',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      } as unknown as IRepository,
      {
        name: 'NullSkatt',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      } as unknown as IRepository,
      {
        name: 'test-datamodels',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      } as unknown as IRepository,
    ];
    const services = getListOfServicesExcludingDatamodels(serviceList);
    const mockResult = [
      {
        name: 'testService',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
      {
        name: 'NullSkatt',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
    ];

    expect(services).toEqual(mockResult);
  });
});
