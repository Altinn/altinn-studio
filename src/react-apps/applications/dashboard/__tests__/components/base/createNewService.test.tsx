/* tslint:disable:jsx-wrap-multiline */
/* tslint:disable:max-line-length */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from '../../../../shared/src/utils/networking';
import { CreateNewServiceComponent } from '../../../src/features/createService/createNewService';

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

    // Assert removing non a-z in beginning of name
    expect(instance.createRepoNameFromServiceName('1234_-FjernerTallOgSpesialTegnIStartenAvNavn'))
      .toBe('fjernertallogspesialtegnistartenavnavn');

    // Assert spaces
    expect(instance.createRepoNameFromServiceName('1234 Removes Numbers And Inserts Dashes'))
      .toBe('removes-numbers-and-inserts-dashes');

    // Assert æøå replacement
    expect(instance.createRepoNameFromServiceName('Tjeneste med æ ø og å 2019'))
      .toBe('tjeneste-med-ae-oe-og-aa-2019');

    // Assert replace illegal characters
    expect(instance.createRepoNameFromServiceName('Replaces three illegal characters with one dash($_?2019'))
      .toBe('replaces-three-illegal-characters-with-one-dash-2019');

    // Assert lowercase
    expect(instance.createRepoNameFromServiceName('1234RemovesNumbersAndUppercaseLetters'))
      .toBe('removesnumbersanduppercaseletters');

    // Assert substring
    expect(instance.createRepoNameFromServiceName('TjenesteMedVeldigLangtNavnSomOverstiger100TegnOmNoenFlereOrdHerNaaErViSnartIMaalMedNokOrd-JaErHundreDetteErOverHundre'))
      .toBe('tjenestemedveldiglangtnavnsomoverstiger100tegnomnoenflereordhernaaervisnartimaalmednokord-jaerhundre');
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

    // Assert valid name with dash and number
    instance.state.repoName = 'this-is-a-valid-servicename-2019';
    expect(instance.validateService()).toBe(true);

    // Assert name with uppercase
    instance.state.repoName = 'ThisIsNotAValidServiceName';
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

    const mockServiceName = '1234service-name';
    instance.handleServiceNameUpdated({ target: { value: mockServiceName } });
    expect(instance.state.serviceName).toBe(mockServiceName);

    const mockRepoName = 'service-name';
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

    // When reponame is null, convert service name to valid reponame
    instance.state.serviceName = 'Service Name';
    instance.state.repoName = null;
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('service-name');

    // RepoName is RepoName
    instance.state.repoName = 'service-name-2019';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('service-name-2019');

    // Repo name is still 'service-name-2019'
    instance.state.serviceName = 'Service Name';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('service-name-2019');

    // Reponame does not change when service name changes
    instance.state.serviceName = 'Service Name';
    instance.state.repoName = 'repo-name';
    instance.handleServiceNameOnBlur();
    expect(instance.state.repoName).toBe('repo-name');

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
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 422,
    };
    const getStub = jest.fn();
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockResult));

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
    instance.state.repoName = 'service-name';
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
    instance._isMounted = true;
    instance.state.repoName = 'service-name';
    instance.state.selectedOrgOrUser = mockSelectableUser[0].name;
    const mockResult = {
      repositoryCreatedStatus: 201,
      full_name: 'FirstOrg/service-name',
    };
    const getStub = jest.fn();
    const getSpy = jest.spyOn(networking, 'post').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockResult));

    window.location.assign = jest.fn();
    instance.createNewService();
    expect(instance.state.isLoading).toBe(true);
    return Promise.resolve().then(() => {
      expect(getSpy).toHaveBeenCalled();
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
