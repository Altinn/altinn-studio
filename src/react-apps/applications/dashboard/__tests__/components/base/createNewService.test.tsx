import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from '../../../../shared/src/utils/networking';
import { CreateNewServiceComponent } from '../../../src/dashboardServices/createService/createNewService';

describe('>>> components/base/createNewService.tsx', () => {
  let mockSelectableUser: any;
  let mockClasses: any;
  let mockLanguage: any;

  beforeEach(() => {
    mockSelectableUser = [
      { name: 'FirstUser', full_name: '' },
      { name: 'FirstOrg', full_name: '' },
      { name: 'SecondOrg', full_name: '' },
    ];
    mockClasses = {};
    mockLanguage = { dashboard: {} };

  });

  it('+++ should handle update modal state on open and close', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.handleModalOpen();
    expect(instance.state.isOpen).toBe(true);
    expect(instance.state.selectedOrgOrUser).toBe('');
    expect(instance.state.selectedOrgOrUserDisabled).toBe(false);

    instance.handleModalClose();
    expect(instance.state.isOpen).toBe(false);
    expect(instance.state.selectedOrgOrUser).toBe('');
    expect(instance.state.serviceName).toBe('');
    expect(instance.state.repoName).toBe('');
  });

  it('+++ should handle update popper message on show popper methods', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const mockMessage = 'mockMessage';
    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.showServiceOwnerPopper(mockMessage);
    expect(instance.state.serviceOwnerPopperMessage).toBe(mockMessage);

    instance.showRepoNamePopper(mockMessage);
    expect(instance.state.repoNamePopperMessage).toBe(mockMessage);
  });

  it('+++ should handle validating empty service owner and repo name with showing poppers', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.validateService();
    expect(instance.state.serviceOwnerPopperMessage).toBe('dashboard.field_cannot_be_empty');
    expect(instance.state.repoNamePopperMessage).toBe('dashboard.field_cannot_be_empty');
  });

  it('+++ should handle validating reponame and serviceowner with appropriate popper messages', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.state.repoName = '1234ThisIsAnInValidServiceName';
    instance.validateService();

    expect(instance.state.serviceOwnerPopperMessage).toBe('dashboard.field_cannot_be_empty');
    expect(instance.state.repoNamePopperMessage).toBe('dashboard.service_name_has_illegal_characters');
  });

  it('+++ should handle creating reponame out of service name', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    expect(instance.createRepoNameFromServiceName('1234ThisIsAnInValidServiceName')).toBe('ThisIsAnInValidServiceName');
    expect(instance.createRepoNameFromServiceName('1234 This Is A Valid Service Name'))
      .toBe('This_Is_A_Valid_Service_Name');
    // tslint:disable-next-line:max-line-length
    expect(instance.createRepoNameFromServiceName('SpicyJalapenoBaconIpsumDolorAmetCillumShankVelitAdipisicingFugiatDuisShortRibsShortLoinPariaturCapicolaVenison'))
      .toBe('SpicyJalapenoBaconIpsumDolorAmetCillumShankVelitAdipisicingFugiatDuisShortRibsShortLoinPariaturCapic');
    expect(instance.createRepoNameFromServiceName('Særvice Næme')).toBe('Saervice_Naeme');
    expect(instance.createRepoNameFromServiceName('1234__ThisIsAnInValidServiceName'))
      .toBe('ThisIsAnInValidServiceName');
  });

  it('+++ should validate service names', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    instance.state.repoName = '1234ThisIsAnInValidServiceName';
    expect(instance.validateService()).toBe(false);
    instance.state.repoName = 'ThisIsAValidServiceName';
    expect(instance.validateService()).toBe(true);
    // tslint:disable-next-line:max-line-length
    instance.state.repoName = 'SpicyJalapenoBaconIpsumDolorAmetCillumShankVelitAdipisicingFugiatDuisShortRibsShortLoinPariaturCapicolaVenison';
    expect(instance.validateService()).toBe(false);
  });

  it('+++ should handle updateing service owner, service name and repo name', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.handleUpdateDropdown({ target: { value: mockSelectableUser[0].name } });
    expect(instance.state.selectedOrgOrUser).toBe(mockSelectableUser[0].name);

    const mockServiceName = 'Service name';
    instance.handleServiceNameUpdated({ target: { value: mockServiceName } });
    expect(instance.state.serviceName).toBe(mockServiceName);

    const mockRepoName = 'ServiceName';
    instance.handleRepoNameUpdated({ target: { value: mockRepoName } });
    expect(instance.state.repoName).toBe(mockRepoName);
  });

  it('+++ should handle update reponame on blur', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.state.repoName = 'ServiceName';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('ServiceName');

    instance.state.serviceName = 'Service Name';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('ServiceName');

    instance.state.serviceName = 'Service Name';
    instance.state.repoName = 'RepoName';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('RepoName');
  });

  it('+++ should handle creating new service when servicename is already taken', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance._isMounted = true;
    instance.state.repoName = 'ServiceName';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 422,
    };
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(() => Promise.resolve(mockResult));
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(instance._isMounted).toBe(true);
      expect(instance.state.isLoading).toBe(false);
      expect(instance.state.repoNamePopperMessage).toBe('dashboard.service_name_already_exist');
    });
  });

  it('+++ should handle unknown repositoryCreatedStatus 418', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance._isMounted = true;
    instance.state.repoName = 'ServiceName';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 418,
    };
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(() => Promise.resolve(mockResult));
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(instance._isMounted).toBe(true);
      expect(instance.state.isLoading).toBe(false);
      expect(instance.state.repoNamePopperMessage).toBe('dashboard.error_when_creating_service');
    });
  });

  it('+++ should handle error when creating new service fails', async () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance._isMounted = true;
    instance.state.repoName = 'ServiceName';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockError = Error('mocked error');
    const getStub = jest.fn();
    const mockPost = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.reject(mockError));
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    await Promise.resolve();
    expect(mockPost).toHaveBeenCalled();
    expect(instance._isMounted).toBe(true);
    expect(instance.state.isLoading).toBe(false);
    expect(instance.state.repoNamePopperMessage).toBe('dashboard.error_when_creating_service');
  });

  it('+++ should handle successfully creating new service', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance._isMounted = true;
    instance.state.repoName = 'ServiceName';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 201,
      full_name: 'FirstOrg/ServiceName',
    };
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(() => Promise.resolve(mockResult));
    window.location.assign = jest.fn();
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      // tslint:disable-next-line:max-line-length
      expect(window.location.assign).toHaveBeenCalledWith(`${window.location.origin}/designer/${mockResult.full_name}#/aboutservice`);
    });
  });

  it('+++ should set isMounted', () => {
    const mountedComponent = mount(
      <CreateNewServiceComponent
        language={mockLanguage}
        selectableUser={mockSelectableUser}
        classes={mockClasses}
      />,
    );

    const instance = mountedComponent.instance() as CreateNewServiceComponent;
    instance.componentDidMount();
    expect(instance._isMounted).toBe(true);
    instance.componentWillUnmount();
    expect(instance._isMounted).toBe(false);

  });
});
