/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { getListOfServicesExcludingCodelist, ServicesOverview } from '../../../features/serviceOverview/servicesOverview';

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

  it('+++ if there are no services getListOfServicesExcludingCodelist should return null', () => {
    const services = getListOfServicesExcludingCodelist(null);
    expect(services).toEqual(null);
  });

  it('+++ if there are services getListOfServicesExcludingCodelist should return services without codelists', () => {
    const serviceList = [
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
      {
        name: 'codelists',
        owner: { full_name: 'Ulf Utvikler' },
        permissions: {
          push: true,
        },
      },
    ];
    const services = getListOfServicesExcludingCodelist(serviceList);
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
