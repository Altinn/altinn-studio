import React from 'react';
import configureStore from 'redux-mock-store';
import {
  AccessControlContainerClass,
  IAccessControlContainerProps,
  IAccessControlContainerState,
  PartyTypes,
} from './AccessControlContainer';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  versionControlHeaderafterAll,
  versionControlHeaderafterEach,
  versionControlHeaderBeforeAll,
    versionControllHeaderApiCalls,
} from 'app-shared/version-control/versionControlHeader.test';

const newApplicationMetadata: any = {
  // must be opposite of currentApplicationMetadata.partyTypesAllowed
  partyTypesAllowed: {
    bankruptcyEstate: true,
    subUnit: false,
    person: true,
    organisation: false,
  },
};

const currentApplicationMetadata: any = {
  partyTypesAllowed: {
    bankruptcyEstate: false,
    subUnit: true,
    person: false,
    organisation: true,
  },
};
const accessContainerState: IAccessControlContainerState = {
  partyTypesAllowed: currentApplicationMetadata.partyTypesAllowed,
  setStateCalled: false,
};
const nextAccessContainerProps: IAccessControlContainerProps = {
  applicationMetadata: newApplicationMetadata,
  language: {},
  classes: {},
};
const currentAccessContainerProps: IAccessControlContainerProps = {
  applicationMetadata: currentApplicationMetadata,
  language: {},
  classes: {},
};

const renderAccessControlContainerClass = (applicationMetadata?: any) => {
  const mockLanguage = {};

  const initialState: any = {
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
      applicationMetadata: applicationMetadata ?? currentApplicationMetadata,
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
  const store = configureStore()(initialState);
  const user = userEvent.setup();

  render(
    <AccessControlContainerClass
      applicationMetadata={
        initialState.applicationMetadataState.applicationMetadata
      }
      language={{}}
      classes={{}}
      dispatch={store.dispatch}
    />,
  );
  return { store, user };
};

beforeAll(versionControlHeaderBeforeAll);
afterEach(versionControlHeaderafterEach);
afterAll(versionControlHeaderafterAll);

test('getDerivedStateFromProps should only return object on changed state', () => {
  const shouldUpdateOnEqualProps =
    AccessControlContainerClass.getDerivedStateFromProps(
      nextAccessContainerProps,
      accessContainerState,
    );
  const shouldNotUpdateOnNewProps =
    AccessControlContainerClass.getDerivedStateFromProps(
      currentAccessContainerProps,
      accessContainerState,
    );
  const shouldNotUpdateOnNullValues =
    AccessControlContainerClass.getDerivedStateFromProps(
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

test('should correctly update partyTypesAllowed state when handlePartyTypesAllowedChange is triggered', async () => {
  const { user, store } = renderAccessControlContainerClass();
  const initialState = store.getState() as any;
  const initialPartyTypesAllowed =
    initialState.applicationMetadataState.applicationMetadata.partyTypesAllowed;
  const partyTypes = Object.keys(PartyTypes);

  // Checking that initial state get set correct
  partyTypes.forEach((partyType) => {
    const checkbox = screen.getByRole('checkbox', {
      name: 'access_control.' + partyType,
    });
    expect(checkbox.hasAttribute('checked')).toBe(
      initialPartyTypesAllowed[partyType],
    );
  });

  let partyTypeIndex = 0;
  while (partyTypes[partyTypeIndex]) {
    await user.click(
      screen.getByRole('checkbox', {
        name: 'access_control.' + partyTypes[partyTypeIndex],
      }),
    );
    partyTypeIndex++;
  }

  const actions = store.getActions();
  const lastPartyTypesAllowed =
    actions.at(-1).payload.applicationMetadata.partyTypesAllowed;
  partyTypes.forEach((partyType) =>
    expect(lastPartyTypesAllowed[partyType]).toBe(
      !initialPartyTypesAllowed[partyType],
    ),
  );
});

test('constructor should initiate partyTypesAllowed with empty values if passed as null', async () => {
  renderAccessControlContainerClass({});
  await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(2));
  Object.keys(PartyTypes).forEach((partyType) => {
    expect(
      screen.getByRole('checkbox', {
        name: 'access_control.' + partyType,
      }),
    ).not.toBeChecked();
  });
});
