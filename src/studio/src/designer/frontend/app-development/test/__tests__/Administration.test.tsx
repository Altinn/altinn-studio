import 'jest';
import * as React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Administration } from '../../features/administration/components/Administration';
import { ICommit, IRepository } from '../../types/global';
import { renderWithProviders } from 'test/testUtils';
import { IHandleServiceInformationState } from 'features/administration/handleServiceInformationSlice';

jest.mock('axios');
jest.mock('app-shared/version-control/versionControlHeader', () => {
  return {
    default: () => 'VersionControlHeader',
  };
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('Administration', () => {
  const mockService: IRepository = {
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
  const mockServiceName = 'AppName';
  const mockInitialCommit: ICommit = {
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
  const mockServiceDescription = 'AppDescription';
  const mockServiceId = 'AppId';
  const mockServiceInformation: IHandleServiceInformationState = {
    initialCommit: mockInitialCommit,
    repositoryInfo: mockService,
    serviceDescriptionObj: {
      description: mockServiceDescription,
      saving: false,
    },
    serviceIdObj: {
      serviceId: mockServiceId,
      saving: false,
    },
    serviceNameObj: {
      name: mockServiceName,
      saving: false,
    },
    error: null,
  };

  it('should show spinner when loading required data', () => {
    renderWithProviders(
      <Administration />,
    );
    const contentLoader = screen.queryByText('Laster siden');
    expect(contentLoader).not.toBeNull();
  });

  it('should handle sucessfully updating app name', async () => {
    const utils = renderWithProviders(
      <Administration />,
      {
        preloadedState: {
          serviceInformation: mockServiceInformation,
        }
      }
    );
    const dispatchSpy = jest.spyOn(utils.store, 'dispatch');
    const mockEvent = { target: { value: 'New name' } };

    const editButton = utils.getByText('general.edit').closest('button');
    fireEvent.click(editButton);

    const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputServicename_textField');
    expect((inputElement as HTMLInputElement).value).toEqual(mockServiceName);

    fireEvent.change(inputElement, mockEvent);
    expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value);

    fireEvent.blur(inputElement);

    await waitFor(() => {
      expect(dispatchSpy).toBeCalledWith({
        payload: {
          url: 'http://localhost/designer/undefined/undefined/Config/SetServiceConfig',
          newServiceName: mockEvent.target.value,
          newServiceId: mockServiceId,
          newServiceDescription: mockServiceDescription
        },
        type: 'handleServiceInformation/saveServiceConfig'
      });
      expect(dispatchSpy).toBeCalledWith({
        payload: {
          url: 'http://localhost/designer/undefined/undefined/Text/SetServiceName',
          newServiceName: mockEvent.target.value
        },
        type: 'handleServiceInformation/saveServiceName'
      });
    })
  });


  it('should handle sucessfully updating app description', async () => {
    const utils = renderWithProviders(
      <Administration />,
      {
        preloadedState: {
          serviceInformation: mockServiceInformation,
        }
      }
    );
    const mockEvent = { target: { value: 'New description' } };
    const dispatchSpy = jest.spyOn(utils.store, 'dispatch');

    const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputDescription_textField');
    expect((inputElement as HTMLInputElement).value).toEqual(mockServiceDescription);

    fireEvent.change(inputElement, mockEvent);
    expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value);

    fireEvent.blur(inputElement);

    await waitFor(() => {
      expect(dispatchSpy).toBeCalledWith({
        payload: {
          url: 'http://localhost/designer/undefined/undefined/Config/SetServiceConfig',
          newServiceName: mockServiceName,
          newServiceId: mockServiceId,
          newServiceDescription: mockEvent.target.value
        },
        type: 'handleServiceInformation/saveServiceConfig'
      });
    });
  });

  it('should handle sucessfully updating app id', async () => {
    const utils = renderWithProviders(
      <Administration />,
      {
        preloadedState: {
          serviceInformation: mockServiceInformation,
        }
      }
    );
    const dispatchSpy = jest.spyOn(utils.store, 'dispatch');
    const mockEvent = { target: { value: 'New id' } };

    const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputServiceid_textField');
    expect((inputElement as HTMLInputElement).value).toEqual(mockServiceId);

    fireEvent.change(inputElement, mockEvent);
    expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value);

    fireEvent.blur(inputElement);

    await waitFor(() => {
      expect(dispatchSpy).toBeCalledWith({
        payload: {
          url: 'http://localhost/designer/undefined/undefined/Config/SetServiceConfig',
          newServiceName: mockServiceName,
          newServiceId: mockEvent.target.value,
          newServiceDescription: mockServiceDescription
        },
        type: 'handleServiceInformation/saveServiceConfig'
      });
    });
  });
});
