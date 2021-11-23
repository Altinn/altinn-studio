import { mount } from 'enzyme';
import { Action } from 'history';
import 'jest';
import * as moment from 'moment';
import * as React from 'react';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import * as networking from 'app-shared/utils/networking';
import { CloneServiceComponent } from '../../../../features/cloneService/cloneServices';

describe('>>> components/base/cloneService.tsx', () => {
  let mockServices: any;
  let mockClasses: any;
  let mockLocation: any;
  let mockHistory: any;
  let mockMatch: any;
  let mockLanguage: any;
  let mockResult: any;
  let mockDate: any;

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
        is_cloned_to_local: false,
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
    mockResult = {
      commit: {
        author: {
          name: 'Kari',
        },
      },
    };
    mockDate = moment.utc(new Date('2019-01-10T11:22:42Z')).local();

    const mockWindow = { ...window.location };
    delete mockWindow.assign;
    delete window.location;
    window.location = {
      assign: jest.fn(),
      ...mockWindow,
    };
  });

  it('+++ should return first service in list', () => {
    jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));
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
    jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));
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

  it('+++ should set last changed by on componentDidMount', async () => {
    mockMatch = {
      params: {
        org: 'OrgNotInList',
        serviceName: 'MyService',
      },
      isExact: false,
      path: '',
      url: '',
    };
    const getSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));

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
    const componentDidMountSpy = jest.spyOn(instance, 'componentDidMount');
    instance.componentDidMount();
    await Promise.resolve();
    expect(instance.componentMounted).toBe(true);
    expect(componentDidMountSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
    expect(instance.state.lastChangedBy).toBe(mockResult.commit.author.name);
  });

  it('+++ should clone service and redirect user to created service', async () => {
    const getSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));
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
    const cloneAndEditServiceSpy = jest.spyOn(instance, 'cloneAndEditService');
    const getCurrentRepositoryInfoSpy = jest.spyOn(instance, 'getCurrentRepositoryInfo');
    instance.componentDidMount();
    await Promise.resolve();
    expect(getSpy).toHaveBeenCalled();
    expect(getCurrentRepositoryInfoSpy).toHaveBeenCalled();
    const secondGetSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(''));
    mountedComponent.find('button#editService').simulate('click');
    expect(cloneAndEditServiceSpy).toHaveBeenCalled();
    expect(instance.state.isLoading).toBe(true);
    await Promise.resolve();
    expect(secondGetSpy).toHaveBeenCalled();
    expect(window.location.assign)
      .toHaveBeenCalledWith(`${window.location.origin}/designer/${mockServices[0].full_name}`);
    await Promise.resolve();
  });

  it('+++ should redirect user to already cloned service', async () => {
    const getSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));
    mockServices[0].is_cloned_to_local = true;
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
    const cloneAndEditServiceSpy = jest.spyOn(instance, 'cloneAndEditService');
    const getCurrentRepositoryInfoSpy = jest.spyOn(instance, 'getCurrentRepositoryInfo');
    instance.componentDidMount();
    await Promise.resolve();
    expect(getSpy).toHaveBeenCalled();
    expect(getCurrentRepositoryInfoSpy).toHaveBeenCalled();
    const secondGetSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(''));
    mountedComponent.find('button#editService').simulate('click');
    expect(cloneAndEditServiceSpy).toHaveBeenCalled();
    expect(instance.state.isLoading).toBe(true);
    await Promise.resolve();
    expect(secondGetSpy).toHaveBeenCalled();
    expect(window.location.assign)
      .toHaveBeenCalledWith(`${window.location.origin}/designer/${mockServices[0].full_name}`);
  });

  it('+++ should redirect user to service code', async () => {
    const getSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockResult));
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
    const redirectToCodeSpy = jest.spyOn(instance, 'redirectToCode');
    const getCurrentRepositoryInfoSpy = jest.spyOn(instance, 'getCurrentRepositoryInfo');
    instance.componentDidMount();
    await Promise.resolve();
    expect(getSpy).toHaveBeenCalled();
    expect(getCurrentRepositoryInfoSpy).toHaveBeenCalled();
    mountedComponent.find('button#seeSourceCode').simulate('click');
    expect(redirectToCodeSpy).toHaveBeenCalled();
    expect(window.location.assign)
      .toHaveBeenCalledWith(`/repos/${mockServices[0].full_name}`);
  });

  it('+++ should set component to unmounted on componentWillUnmount ', () => {
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
    const componentWillUnmountSpy = jest.spyOn(instance, 'componentWillUnmount');
    instance.componentWillUnmount();
    expect(componentWillUnmountSpy).toHaveBeenCalled();
    expect(instance.componentMounted).toBe(false);
  });

  it('+++ Should show correct date', () => {
    expect(formatNameAndDate('', mockServices[0].created_at)).toBe(mockDate.format('DD.MM.YYYY HH:mm'));
    expect(formatNameAndDate('', mockServices[0].created_at) === `${mockDate}`).toBe(false);
    expect(formatNameAndDate('Kari', mockServices[0].created_at)).toBe(`Kari ${mockDate.format('DD.MM.YYYY HH:mm')}`);
    expect(formatNameAndDate('Kari', mockServices[0].created_at) === `Kari ${mockDate}`).toBe(false);
  });
});
