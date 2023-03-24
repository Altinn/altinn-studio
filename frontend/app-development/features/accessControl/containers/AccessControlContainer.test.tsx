import React from 'react';
import { AccessControlContainer } from './AccessControlContainer';
import { renderWithProviders } from '../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { RootState } from 'app-development/store';
import { screen } from '@testing-library/react';

const currentApplicationMetadata: any = {
  partyTypesAllowed: {
    bankruptcyEstate: false,
    subUnit: true,
    person: false,
    organisation: true,
  },
};

const renderAccessControlContainer = (applicationMetadata?: any) => {

  const initialState: Partial<RootState> = {
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
      branch: null,
      error: null,
    },
    dataModelsMetadataState: null,
    dataModelling: null,
    serviceInformation: null,
    userState: null,
  };

  return renderWithProviders(<AccessControlContainer />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    preloadedState: initialState,
  });
};

describe('When loading AccessControlContainer', () => {
  it('should render all checkboxes unchecked when applicationMetadata does not contain partyTypesAllowed', () => {
    renderAccessControlContainer({
      ...currentApplicationMetadata,
      partyTypesAllowed: null,
    });
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => expect(c).not.toBeChecked());
  });

  it('should render checkboxes as defined by applicationMetadata.partyTypesAllowed object', () => {
    renderAccessControlContainer();
    const checkboxes = screen.queryAllByRole('checkbox');
    const partyTypesAllowed = currentApplicationMetadata.partyTypesAllowed;
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => {
      if (partyTypesAllowed[c.getAttribute('name')]) {
        expect(c).toBeChecked();
      } else {
        expect(c).not.toBeChecked();
      }
    });
  });
});
