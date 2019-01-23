import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { ServiceCard } from '../../../src/dashboardServices/serviceOverview/serviceCard';
import { ServiceCardComponent } from '../../../src/dashboardServices/serviceOverview/serviceCard';

jest.mock('react-truncate-markup');

describe('>>> components/base/serviceCard.tsx --- Snapshot', () => {
  let mockService: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockService = {
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
      is_cloned_to_local: false,
    };
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
        <ServiceCard
          service={mockService}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should show correct date', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard
          service={mockService}
        />
      </Provider>,
    );
    // tslint:disable-next-line:max-line-length
    expect(wrapper.contains(<p className='MuiTypography-root-142 MuiTypography-body1-151 MuiTypography-noWrap-168 Connect-ServiceCardComponent--displayInlineBlock-1 Connect-ServiceCardComponent--width100-2 Connect-ServiceCardComponent--textToRight-5 Connect-ServiceCardComponent--fontSize_14-9 Connect-ServiceCardComponent--fontWeight_500-8'>dashboard.last_changed_service 13.11.2018</p>)).toBe(true);
    // tslint:disable-next-line:max-line-length
    expect(wrapper.contains(<p className='MuiTypography-root-142 MuiTypography-body1-151 MuiTypography-noWrap-168 Connect-ServiceCardComponent--displayInlineBlock-1 Connect-ServiceCardComponent--width100-2 Connect-ServiceCardComponent--textToRight-5 Connect-ServiceCardComponent--fontSize_14-9 Connect-ServiceCardComponent--fontWeight_500-8'>dashboard.last_changed_service {mockService.updated_at}</p>)).toBe(false);
  });

  it('+++ should open service or redirect to clone page', () => {
    const mockClasses = {};
    const mockLanguage = { dashboard: {} };

    const mountedComponent = mount(
      <ServiceCardComponent
        service={mockService}
        classes={mockClasses}
        language={mockLanguage}
      />,
    );
    const instance = mountedComponent.instance() as ServiceCardComponent;
    window.location.assign = jest.fn();
    instance.openService();
    // tslint:disable-next-line:max-line-length
    expect(window.location.assign).toHaveBeenCalledWith(`/Home/Index#/cloneservice/${mockService.owner.login}/${mockService.name}`);

    mockService.is_cloned_to_local = true;
    instance.openService();
    // tslint:disable-next-line:max-line-length
    expect(window.location.assign).toHaveBeenCalledWith(`/designer/${mockService.full_name}`);
  });
});
