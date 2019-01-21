import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { ServicesCategory } from '../../../src/dashboardServices/serviceOverview/servicesCategory';

describe('>>> components/base/serviceCategory.tsx --- Snapshot', () => {
  let mockHeader: any;
  let mockNoServicesMessage: any;
  let mockClassName: any;
  let mockCategoryRepos: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockHeader = 'mock-header';
    mockNoServicesMessage = 'dashboard.no_category_service_read';
    mockClassName = 'test';
    mockCategoryRepos = [
      {
        description:
          'Dette er en test, dette er en veldig veldig lang test, fordi vi prøver å se om det har noen betydning',
        full_name: 'FirstOrg/First',
        name: 'First',
        owner: {
          full_name: 'This is the full name of this org',
          login: 'FirstOrg',
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
    ];
    const initialState = {
      language: {
        language: {
        },
      },
    };
    mockStore = createStore(initialState);
  });

  it('+++ Should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <ServicesCategory
          header={mockHeader}
          noServicesMessage={mockNoServicesMessage}
          className={mockClassName}
          categoryRepos={mockCategoryRepos}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });
});
