import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import handleServiceInformationActionDispatchers from '../src/features/administration/handleServiceInformationDispatcher';

import { AdministrationComponent } from '../src/features/administration/components/Administration';
import { ICommit, IRepository } from '../src/types/global';

describe('HandleMergeConflictAbort', () => {
  let mockLanguage: any;
  let mockService: IRepository;
  let mockServiceName: string;
  let mockServiceNameIsSaving: boolean;
  let mockInitialCommit: ICommit;
  let mockServiceDescription: string;
  let mockServiceDescriptionIsSaving: boolean;
  let mockClasses: any;
  let mockServiceIdIsSaving: boolean;
  let mockServiceId: string;

  beforeEach(() => {
    mockLanguage = {};
    mockService = {
      clone_url: '',
      created_at: '',
      default_branch: '',
      description: '',
      empty: false,
      fork: false,
      forks_count: 0,
      full_name: '',
      html_url: '',
      id: 123,
      is_cloned_to_local: true,
      mirror: false,
      name: 'CoolService',
      open_issues_count: 0,
      owner: {
        avatar_url: '',
        email: '',
        full_name: 'Mons Monsen',
        id: 234,
        login: 'Mons',
        UserType: 2,
      },
      permissions: {
        admin: true,
        pull: true,
        push: true,
      },
      private: false,
      repositoryCreatedStatus: 0,
      size: 0,
      ssh_url: '',
      stars_count: 1337,
      updated_at: '',
      watchers_count: 0,
      website: '',
    };
    mockServiceName = 'Service name';
    mockServiceNameIsSaving = false;
    mockServiceId = 'service id';
    mockServiceIdIsSaving = false;
    mockInitialCommit = {
      message: '',
      author: {
        email: '',
        name: 'Per',
        when: '',
      },
      comitter: {
        email: '',
        name: 'Per',
        when: '',
      },
      sha: '',
      messageShort: '',
      encoding: '',
    };
    mockServiceDescription = '';
    mockServiceDescriptionIsSaving = false;
    mockClasses = {};
  });

  it('should handle sucessfully calling component did mount and mapping props to state', async () => {
    const mockFetchService = jest.spyOn(handleServiceInformationActionDispatchers, 'fetchService');
    const mockFetchInitialCommit = jest.spyOn(handleServiceInformationActionDispatchers, 'fetchInitialCommit');
    // tslint:disable-next-line:max-line-length
    const mockFetchServiceDescription = jest.spyOn(handleServiceInformationActionDispatchers, 'fetchServiceConfig');

    const wrapper = mount(
      <AdministrationComponent
        classes={mockClasses}
        language={mockLanguage}
        service={mockService}
        serviceName={mockServiceName}
        serviceNameIsSaving={mockServiceNameIsSaving}
        serviceDescription={mockServiceDescription}
        serviceDescriptionIsSaving={mockServiceDescriptionIsSaving}
        initialCommit={mockInitialCommit}
        serviceId={mockServiceId}
        serviceIdIsSaving={mockServiceIdIsSaving}
      />);

    const instance = wrapper.instance() as AdministrationComponent;

    expect(mockFetchService).toHaveBeenCalled();
    expect(mockFetchInitialCommit).toHaveBeenCalled();
    expect(mockFetchServiceDescription).toHaveBeenCalled();
    expect(instance.state.serviceName).toEqual(mockServiceName);
    expect(instance.state.serviceDescription).toEqual(mockServiceDescription);
    expect(instance.state.serviceId).toEqual(mockServiceId);
  });

  it('should handle sucessfully updating service description', async () => {
    const wrapper = mount(
      <AdministrationComponent
        classes={mockClasses}
        language={mockLanguage}
        service={mockService}
        serviceName={mockServiceName}
        serviceNameIsSaving={mockServiceNameIsSaving}
        serviceDescription={mockServiceDescription}
        serviceDescriptionIsSaving={mockServiceDescriptionIsSaving}
        initialCommit={mockInitialCommit}
        serviceId={mockServiceId}
        serviceIdIsSaving={mockServiceIdIsSaving}
      />,
    );

    const instance = wrapper.instance() as AdministrationComponent;

    const mockEvent = {
      target: {
        value: 'New description',
      },
    };

    expect(instance.state.serviceDescription).toEqual(mockServiceDescription);
    expect(instance.state.editServiceDescription).toEqual(false);
    instance.onServiceDescriptionChanged(mockEvent);
    expect(instance.state.editServiceDescription).toEqual(true);
    expect(instance.state.serviceDescription).toEqual(mockEvent.target.value);
    expect(instance.state.serviceDescription).not.toEqual(instance.props.serviceDescription);
    expect(instance.state.serviceDescription).not.toEqual(mockServiceDescription);

    const spySaveServiceDescription = jest.spyOn(handleServiceInformationActionDispatchers, 'saveServiceConfig')
      .mockImplementation(() => wrapper.setProps({ serviceDescription: mockEvent.target.value }));
    instance.onBlurServiceDescription();
    expect(spySaveServiceDescription).toBeCalled();
    expect(instance.state.editServiceDescription).toEqual(false);
    expect(instance.state.serviceDescription).toEqual(instance.props.serviceDescription);
    expect(instance.state.serviceDescription).not.toEqual(mockServiceDescription);
  });

  it('should handle sucessfully updating service id', async () => {
    const wrapper = mount(
      <AdministrationComponent
        classes={mockClasses}
        language={mockLanguage}
        service={mockService}
        serviceName={mockServiceName}
        serviceNameIsSaving={mockServiceNameIsSaving}
        serviceDescription={mockServiceDescription}
        serviceDescriptionIsSaving={mockServiceDescriptionIsSaving}
        initialCommit={mockInitialCommit}
        serviceId={mockServiceId}
        serviceIdIsSaving={mockServiceIdIsSaving}
      />,
    );

    const instance = wrapper.instance() as AdministrationComponent;

    const mockEvent = {
      target: {
        value: 'New id',
      },
    };

    expect(instance.state.serviceId).toEqual(mockServiceId);
    expect(instance.state.editServiceId).toEqual(false);
    instance.onServiceIdChanged(mockEvent);
    expect(instance.state.editServiceId).toEqual(true);
    expect(instance.state.serviceId).toEqual(mockEvent.target.value);
    expect(instance.state.serviceId).not.toEqual(instance.props.serviceId);
    expect(instance.state.serviceId).not.toEqual(mockServiceId);

    const spySaveServiceId = jest.spyOn(handleServiceInformationActionDispatchers, 'saveServiceConfig')
      .mockImplementation(() => wrapper.setProps({ serviceId: mockEvent.target.value }));
    instance.onBlurServiceId();
    expect(spySaveServiceId).toBeCalled();
    expect(instance.state.editServiceId).toEqual(false);
    expect(instance.state.serviceId).toEqual(instance.props.serviceId);
    expect(instance.state.serviceId).not.toEqual(mockServiceId);
  });

  it('should handle sucessfully updating service name', async () => {
    const wrapper = mount(
      <AdministrationComponent
        classes={mockClasses}
        language={mockLanguage}
        service={mockService}
        serviceName={mockServiceName}
        serviceNameIsSaving={mockServiceNameIsSaving}
        serviceDescription={mockServiceDescription}
        serviceDescriptionIsSaving={mockServiceDescriptionIsSaving}
        initialCommit={mockInitialCommit}
        serviceId={mockServiceId}
        serviceIdIsSaving={mockServiceIdIsSaving}
      />,
    );

    const instance = wrapper.instance() as AdministrationComponent;

    const mockEvent = {
      target: {
        value: 'New service name',
      },
    };

    expect(instance.state.serviceName).toEqual(mockServiceName);
    expect(instance.state.editServiceName).toEqual(false);
    instance.handleEditServiceName();
    expect(instance.state.editServiceName).toEqual(true);

    instance.onServiceNameChanged(mockEvent);
    expect(instance.state.serviceName).toEqual(mockEvent.target.value);
    expect(instance.state.serviceName).not.toEqual(instance.props.serviceName);
    expect(instance.state.serviceName).not.toEqual(mockServiceName);

    const spySaveServiceName = jest.spyOn(handleServiceInformationActionDispatchers, 'saveServiceName')
      .mockImplementation(() => wrapper.setProps({ serviceName: mockEvent.target.value }));
    instance.onBlurServiceName();
    expect(spySaveServiceName).toBeCalled();
    expect(instance.state.editServiceName).toEqual(false);
    expect(instance.state.serviceName).toEqual(instance.props.serviceName);
    expect(instance.state.serviceName).not.toEqual(mockServiceName);
  });
});
