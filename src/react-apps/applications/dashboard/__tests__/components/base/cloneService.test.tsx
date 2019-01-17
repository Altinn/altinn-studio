import { mount } from 'enzyme';
import { Action } from 'history';
import 'jest';
import * as React from 'react';
import { CloneServiceComponent } from '../../../src/dashboardServices/cloneService/cloneServices';

describe('>>> components/base/cloneService.tsx --- Snapshot', () => {
  let mockServices: any;
  let mockClasses: any;
  let mockLocation: any;
  let mockHistory: any;
  let mockMatch: any;
  let mockLanguage: any;

  beforeEach(() => {
    mockServices = [
      {
        created_at: '2019-01-10T11:22:42Z',
        description: 'Dette er en beskrivelse',
        full_name: 'MyOrg/MyService',
        owner: {
          full_name: '',
          login: 'MyOrg',
          UserType: 2,
        },
        updated_at: '2019-01-14T11:16:45Z',
      },
    ];
    mockClasses = {};
    mockLocation = {
      pathname: 'pathname',
      search: 'search',
      state: {},
      hash: 'hash',
    };
    mockHistory = {
      length: 1,
      action: 'PUSH' as Action,
      location,
      push: () => false,
      replace: () => false,
      go: () => false,
      goBack: () => false,
      goForward: () => false,
      block: () => (null) as any,
      listen: () => (null) as any,
      createHref: () => '',

    };
    mockMatch = {
      params: {
        org: 'MyOrg',
        serviceName: 'MyService',
      },
      isExact: false,
      path: '',
      url: '',
    };

    mockLanguage = { dashboard: {} };
  });

  // it('+++ Should show correct date', () => {
  //   const mountedComponent = mount(
  //     <CloneServiceComponent
  //       language={mockLanguage}
  //       services={mockServices}
  //       classes={mockClasses}
  //       location={mockLocation}
  //       history={mockHistory}
  //       match={mockMatch}
  //     />,
  //   );

  //   // tslint:disable-next-line:max-line-length
  //   expect(mountedComponent.contains(<p className='MuiTypography-root-100 MuiTypography-body1-109'>dashboard.created_time 10.01.2019 12:22</p>)).toBe(true);
  //   // tslint:disable-next-line:max-line-length
  //   expect(mountedComponent.contains(<p className='MuiTypography-root-100 MuiTypography-body1-109'>dashboard.created_time {mockServices[0].created_at}</p>)).toBe(false);
  //   // tslint:disable-next-line:max-line-length
  //   expect(mountedComponent.contains(<p className='MuiTypography-root-100 MuiTypography-body1-109'>dashboard.last_changed_by 14.01.2019 12:16</p>)).toBe(true);
  //   // tslint:disable-next-line:max-line-length
  //   expect(mountedComponent.contains(<p className='MuiTypography-root-100 MuiTypography-body1-109'>dashboard.last_changed_by {mockServices[0].updated_at}</p>)).toBe(false);
  // });

  it('+++ should return first service in list', () => {

    const mountedComponent = mount(
      <CloneServiceComponent
        language={mockLanguage}
        services={mockServices}
        classes={mockClasses}
        location={mockLocation}
        history={mockHistory}
        match={mockMatch}
      />,
    );

    const instance = mountedComponent.instance() as CloneServiceComponent;
    const spy = jest.spyOn(instance, 'getCurrentRepositoryInfo');
    const service = instance.getCurrentRepositoryInfo();
    expect(spy).toHaveBeenCalled();
    expect(service).toEqual(mockServices[0]);
  });

  it('+++ should return not return any service', () => {
    mockMatch = {
      params: {
        org: 'OrgNotInList',
        serviceName: 'MyService',
      },
      isExact: false,
      path: '',
      url: '',
    };

    const mountedComponent = mount(
      <CloneServiceComponent
        language={mockLanguage}
        services={mockServices}
        classes={mockClasses}
        location={mockLocation}
        history={mockHistory}
        match={mockMatch}
      />,
    );

    const instance = mountedComponent.instance() as CloneServiceComponent;
    const spy = jest.spyOn(instance, 'getCurrentRepositoryInfo');
    const service = instance.getCurrentRepositoryInfo();
    expect(spy).toHaveBeenCalled();
    expect(service).toEqual(null);
  });
});
