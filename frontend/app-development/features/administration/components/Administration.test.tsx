import React from 'react';
import { screen } from '@testing-library/react';
import { Administration } from './Administration';
import type { ICommit, IRepository } from '../../../types/global';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { IHandleServiceInformationState } from '../handleServiceInformationSlice';
import { renderWithProviders } from '../../../test/testUtils';

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
    renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });
    const contentLoader = screen.queryByText('Laster siden');
    expect(contentLoader).not.toBeNull();
  });

  it('should show Apps view when repository is app repository', () => {
    const utils = renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
      preloadedState: {
        serviceInformation: mockServiceInformation,
      },
    });
    const serviceIdText = utils.getByText('administration.service_id');
    expect(serviceIdText).not.toBeNull();
  });

  it('should show Datamodels view when repository name matches "<org>-datamodels" format', () => {
    const utils = renderWithProviders(<Administration />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-org-datamodels`,
      preloadedState: {
        serviceInformation: mockServiceInformation,
      },
    });
    const infoText = utils.getByText('administration.datamodels_info1');
    expect(infoText).not.toBeNull();
  });
});
