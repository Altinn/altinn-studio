import React from 'react';
import { AccessControlContainer } from './AccessControlContainer';
import { renderWithProviders } from '../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { RootState } from 'app-development/store';

const currentApplicationMetadata: any = {
  partyTypesAllowed: {
    bankruptcyEstate: false,
    subUnit: true,
    person: false,
    organisation: true,
  },
};

const renderAccessControlContainer = (applicationMetadata?: any) => {
  const mockLanguage = {};

  const initialState: Partial<RootState> = {
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

  return renderWithProviders(<AccessControlContainer language={mockLanguage} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    preloadedState: initialState,
  });
};

describe('When loading AccessControlContainer', () => {
  it('should render all checkboxes unchecked when applicationMetadata does not contain partyTypesAllowed', () => {
    const screen = renderAccessControlContainer({
      ...currentApplicationMetadata,
      partyTypesAllowed: null,
    });
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => expect(c.ariaChecked).toBeFalsy());
  });

  it('should render checkboxes as defined by applicationMetadata.partyTypesAllowed object', () => {
    const screen = renderAccessControlContainer();
    const checkboxes = screen.queryAllByRole('checkbox');
    const partyTypesAllowed = currentApplicationMetadata.partyTypesAllowed;
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => {
      if (partyTypesAllowed[c.getAttribute('name')]) {
        expect(c.parentElement.parentElement.className).toContain(
          'Checkbox-module_wrapper--checked'
        );
      } else {
        expect(c.parentElement.parentElement.className).not.toContain(
          'Checkbox-module_wrapper--checked'
        );
      }
    });
  });
});
