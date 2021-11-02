
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { AccessControlContainerClass, IAccessControlContainerProps, IAccessControlContainerState, PartyTypes } from '../../features/accessControl/containers/AccessControlContainer';

jest.mock('app-shared/version-control/versionControlHeader', () => {
  return {
    default: () => 'VersionControlHeader',
  };
});

describe('AccessControl', () => {
  let nextAccessContainerProps: IAccessControlContainerProps;
  let currentAccessContainerProps: IAccessControlContainerProps;
  let accessContainerState: IAccessControlContainerState;
  let currentApplicationMetadata: any;
  let newApplicationMetadata: any;
  let mockLanguage: any;
  let initialState: any;
  let mockStore: any;

  beforeEach(() => {
    currentApplicationMetadata = {
      partyTypesAllowed: {
        bankruptcyEstate: false,
        subUnit: true,
        person: false,
        organisation: true,
      },
    };
    newApplicationMetadata = {
      // must be opposite of currentApplicationMetadata.partyTypesAllowed
      partyTypesAllowed: {
        bankruptcyEstate: true,
        subUnit: false,
        person: true,
        organisation: false,
      },
    };
    accessContainerState = {
      partyTypesAllowed: currentApplicationMetadata.partyTypesAllowed,
      setStateCalled: false,
    };
    nextAccessContainerProps = {
      applicationMetadata: newApplicationMetadata,
      language: {},
      classes: {},
    };
    currentAccessContainerProps = {
      applicationMetadata: currentApplicationMetadata,
      language: {},
      classes: {},
    };
    mockLanguage = {};
    initialState = {
      language: {
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
        applicationMetadata: currentApplicationMetadata,
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
    };
    const createStore = configureStore();
    mockStore = createStore(initialState);
  });

  it('getDerivedStateFromProps should only return object on changed state', () => {
    const shouldUpdateOnEqualProps = AccessControlContainerClass.getDerivedStateFromProps(
      nextAccessContainerProps,
      accessContainerState,
    );
    const shouldNotUpdateOnNewProps = AccessControlContainerClass.getDerivedStateFromProps(
      currentAccessContainerProps,
      accessContainerState,
    );
    const shouldNotUpdateOnNullValues = AccessControlContainerClass.getDerivedStateFromProps(
      {
        applicationMetadata: {},
        language: {},
        classes: {},
      },
      accessContainerState,
    );
    expect(shouldUpdateOnEqualProps).not.toBe(null);
    expect(shouldNotUpdateOnNewProps).toBe(null);
    expect(shouldNotUpdateOnNullValues).toBe(null);
  });

  it('should correctly update partyTypesAllowed state when handlePartyTypesAllowedChange is triggered', () => {
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={currentApplicationMetadata}
        language={{}}
        classes={{}}
        dispatch={mockStore.dispatch}
      />,
    );
    const instance = wrapper.instance() as AccessControlContainerClass;
    instance.handlePartyTypesAllowedChange(PartyTypes.bankruptcyEstate);
    instance.handlePartyTypesAllowedChange(PartyTypes.organisation);
    instance.handlePartyTypesAllowedChange(PartyTypes.person);
    instance.handlePartyTypesAllowedChange(PartyTypes.subUnit);
    expect(wrapper.state('partyTypesAllowed')).toEqual(newApplicationMetadata.partyTypesAllowed);
  });

  it('constructor should initiate partyTypesAllowed with empty values if passed as null', () => {
    const createStore = configureStore();
    const store = createStore({
      ...initialState,
      applicationMetadataState: {
        applicationMetadata: {},
        error: null,
      },
    });
    const wrapper = mount(
      <AccessControlContainerClass
        applicationMetadata={{}}
        language={{}}
        classes={{}}
        dispatch={store.dispatch}
      />,
    );
    expect(wrapper.state('partyTypesAllowed')).toEqual({
      bankruptcyEstate: false,
      organisation: false,
      person: false,
      subUnit: false,
    });
  });
});
