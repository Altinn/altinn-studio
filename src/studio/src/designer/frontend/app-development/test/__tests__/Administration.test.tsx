/* eslint-disable no-undef */
/* eslint-disable react/jsx-props-no-spreading */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
// import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import * as renderer from 'react-test-renderer';
import { AdministrationComponent, IAdministrationComponentProps } from '../../features/administration/components/Administration';
import { ICommit, IRepository } from '../../types/global';

jest.mock('app-shared/version-control/versionControlHeader', () => {
  return {
    default: () => 'VersionControlHeader',
  };
});

describe('Administration', () => {
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
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
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

    const initialState: any = {
      languageState: {
        language: mockLanguage,
      },
      appCluster: {
        deploymentList: [],
      },
      appDeployments: {
        createAppDeploymentErrors: [],
        deployments: [],
        getAppDeploymentsError: null,
      },
      appReleases: {
        creatingRelease: false,
        errors: null,
        releases: [],
      },
      applicationMetadataState: {
        applicationMetadata: {},
        error: null,
      },
      configuration: {
        environments: null,
        orgs: null,
      },
      handleMergeConflict: {
        repoStatus: {
          behindBy: 0,
          aheadBy: 0,
          contentStatus: [],
        },
      },
      repoStatus: {
        resettingLocalRepo: false,
      },
      serviceInformation: {
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

      },
    };
    mockStore = createStore(initialState);
    jest.mock('app-shared/version-control/versionControlHeader', () => <></>);
    jest.mock('../../../shared/version-control/versionControlHeader', () => <></>);
  });

  // Todo: Refactor to test onBlurServiceDescription()
  it('Should match snapshot', () => {
    const rendered = renderer.create(<RenderAdministrationComponent />);
    expect(rendered).toMatchSnapshot();
  });

  // it('should handle sucessfully updating service name', async () => {
  //   const utils = render(<RenderAdministrationComponent />);

  //   const mockEvent = {
  //     target: {
  //       value: 'New name',
  //     },
  //   };

  //   const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputServicename_textField');
  //   utils.debug(inputElement as HTMLInputElement);
  //   expect((inputElement as HTMLInputElement).value).toEqual(mockServiceName);
  //   fireEvent.change(inputElement, mockEvent);
  //   waitFor(() => expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value));
  // });

  // it('should handle sucessfully updating service description', async () => {
  //   const utils = render(<RenderAdministrationComponent />);

  //   const mockEvent = {
  //     target: {
  //       value: 'New description',
  //     },
  //   };

  //   const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputDescription_textField');
  //   utils.debug(inputElement as HTMLInputElement);
  //   expect((inputElement as HTMLInputElement).value).toEqual(mockServiceDescription);
  //   fireEvent.change(inputElement, mockEvent);
  //   waitFor(() => expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value));
  // });

  // it('should handle sucessfully updating service id', async () => {
  //   const utils = render(<RenderAdministrationComponent />);

  //   const mockEvent = {
  //     target: {
  //       value: 'New ID',
  //     },
  //   };

  //   const inputElement = utils.getByTestId('administration-container').querySelector('#administrationInputServiceid_textField');
  //   utils.debug(inputElement as HTMLInputElement);
  //   expect((inputElement as HTMLInputElement).value).toEqual(mockServiceId);
  //   fireEvent.change(inputElement, mockEvent);
  //   waitFor(() => expect((inputElement as HTMLInputElement).value).toEqual(mockEvent.target.value));
  // });

  const RenderAdministrationComponent = (props: Partial<IAdministrationComponentProps>): JSX.Element => {
    const defaultProps: IAdministrationComponentProps = {
      classes: mockClasses,
      language: mockLanguage,
      service: mockService,
      serviceName: mockServiceName,
      serviceNameIsSaving: mockServiceNameIsSaving,
      serviceDescription: mockServiceDescription,
      serviceDescriptionIsSaving: mockServiceDescriptionIsSaving,
      initialCommit: mockInitialCommit,
      serviceId: mockServiceId,
      serviceIdIsSaving: mockServiceIdIsSaving,
      dispatch: mockStore.dispatch,
    };

    return (
      <Provider store={mockStore}>
        <AdministrationComponent {...defaultProps} {...props} />
      </Provider>
    );
  };
});
