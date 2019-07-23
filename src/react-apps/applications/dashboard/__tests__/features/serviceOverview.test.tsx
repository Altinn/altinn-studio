import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { ServicesOverview, ServicesOverviewComponent } from '../../src/features/serviceOverview/servicesOverview';

describe('>>> features/serviceOverview', () => {
  let mockStore: any;
  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      dashboard: {
        services: [
          {
            name: 'testService',
            owner: { full_name: 'Ulf Utvikler' },
            permissions: true,
          },
          {
            name: 'NullSkatt',
            owner: { full_name: 'Ulf Utvikler' },
            permissions: true,
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
  it('+++ should run searchAndFilterServicesIntoCategoriesCategory on search', () => {
    const mountedServiceOverview = mount(
      <Provider store={mockStore}>
         <ServicesOverview />
      </Provider>,
    );
    const instance = mountedServiceOverview.find('ServicesOverviewComponent').instance() as ServicesOverviewComponent;
    const spy = jest.spyOn(instance, 'searchAndFilterServicesIntoCategoriesCategory');

    const searchField = mountedServiceOverview.find('input');
    searchField.simulate('change', { target: {value: 'test'}});
    instance.forceUpdate();
    expect(spy).toHaveBeenCalled();
  });
});
