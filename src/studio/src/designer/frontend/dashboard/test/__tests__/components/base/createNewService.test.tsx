

import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from 'app-shared/utils/networking';
import { appNameRegex, CreateNewServiceComponent } from '../../../../features/createService/createNewService';

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

    const mockWindow = { ...window.location };
    delete mockWindow.assign;
    delete window.location;
    window.location = {
      assign: jest.fn(),
      ...mockWindow,
    };

  });

  let consoleError: any;

  beforeAll(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {
      return {};
    });
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

    // Assert empty name
    instance.state.repoName = '';
    expect(instance.validateService()).toBe(false);

    // Assert namestarts with number
    instance.state.repoName = '1234thisisnotvalid';
    expect(instance.validateService()).toBe(false);

    // Assert valid name
    instance.state.repoName = 'thisisavalidservicename';
    expect(instance.validateService()).toBe(true);

    // Assert name with uppercase
    instance.state.repoName = 'ThisIsNotAValidServiceName';
    expect(instance.validateService()).toBe(false);

    // Assert name that ends with illegar characters
    instance.state.repoName = 'valid-but-illegal-at-end-';
    expect(instance.validateService()).toBe(false);

    // Assert a very long name
    instance.state.repoName = 'SpicyJalapenoBaconIpsumDolorAmetCillumShankVelitAdipisicingFugiatDuisShortRibsShortLoinPariaturCapicolaVenison';
    expect(instance.validateService()).toBe(false);
  });

  it('+++ should handle updating service owner, service name and repo name', () => {
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

    const mockRepoName = 'service-name';
    instance.handleRepoNameUpdated({ target: { value: mockRepoName } });
    expect(instance.state.repoName).toBe(mockRepoName);
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
    instance.componentMounted = true;
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 409,
    };
    const getStub = jest.fn();
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockResult));

    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(instance.componentMounted).toBe(true);
      expect(instance.state.isLoading).toBe(false);
      expect(instance.state.repoNamePopperMessage).toBe('dashboard.app_already_exist');
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
    instance.componentMounted = true;
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 418,
    };

    const getStub = jest.fn();
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockResult));

    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(instance.componentMounted).toBe(true);
      expect(instance.state.isLoading).toBe(false);
      expect(instance.state.repoNamePopperMessage).toBe('dashboard.error_when_creating_app');
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
    instance.componentMounted = true;
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockError = Error('mocked error');
    const getStub = jest.fn();
    const mockPost = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.reject(mockError));
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    await Promise.resolve();
    // workaround to resolve promise, making test run
    await Promise.resolve();
    expect(mockPost).toHaveBeenCalled();
    expect(instance.componentMounted).toBe(true);
    expect(instance.state.isLoading).toBe(false);
    expect(instance.state.repoNamePopperMessage).toBe('dashboard.error_when_creating_app');
    expect(consoleError).toHaveBeenCalled();
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
    instance.componentMounted = true;
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 201,
      full_name: 'FirstOrg/service-name',
    };
    const getStub = jest.fn();
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockResult));

    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
      expect(window.location.assign).toHaveBeenCalledWith(`${window.location.origin}/designer/${mockResult.full_name}#/about`);
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
    expect(instance.componentMounted).toBe(true);
    instance.componentWillUnmount();
    expect(instance.componentMounted).toBe(false);
  });

  it('+++ app name regex should return false on capital letters', () => {
    expect(appNameRegex.test('An-app')).toBe(false);
    expect(appNameRegex.test('an-APp')).toBe(false);
    expect(appNameRegex.test('an-apP')).toBe(false);
  });

  it('+++ app name regex should return false on names that start with "datamodels"', () => {
    expect(appNameRegex.test('datamodels')).toBe(false);
    expect(appNameRegex.test('datamodelsAPP')).toBe(false);
  });

  it('+++ app name regex should return OK on valid app name', () => {
    expect(appNameRegex.test('app-name')).toBe(true);
  });
});
