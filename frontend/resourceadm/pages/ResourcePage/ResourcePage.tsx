import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from '../../utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import {
  useSinlgeResourceQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from '../../hooks/queries';
import { MergeConflictModal } from '../../components/MergeConflictModal';
import { AboutResourcePage } from '../AboutResourcePage';
import { NavigationModal } from '../../components/NavigationModal';
import { Spinner } from '@digdir/designsystemet-react';
import { useEditResourceMutation } from '../../hooks/mutations';
import { MigrationPage } from '../MigrationPage';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import {
  GavelSoundBlockIcon,
  InformationSquareIcon,
  MigrationIcon,
  UploadIcon,
} from '@studio/icons';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { createNavigationTab, deepCompare, getAltinn2Reference } from '../../utils/resourceUtils';
import type { EnvId } from '../../utils/resourceUtils';
import { ResourceAccessLists } from '../../components/ResourceAccessLists';
import { AccessListDetail } from '../../components/AccessListDetails';
import { useGetAccessListQuery } from '../../hooks/queries/useGetAccessListQuery';
import { useUrlParams } from '../../hooks/useUrlParams';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

/**
 * @component
 *    Displays the 4 pages to manage resources and a left navigation bar.
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourcePage = (): React.JSX.Element => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const autoSaveTimeoutRef = useRef(undefined);

  const { pageType, resourceId, org, app, env, accessListId } = useUrlParams();
  const currentPage = pageType as NavigationBarPage;

  // Stores the temporary next page
  const [nextPage, setNextPage] = useState<NavigationBarPage>('about');

  // Use a local resource object as model to update immediately after user input. Use debounce to save this object every 500 ms
  const [resourceData, setResourceData] = useState<Resource | null>(null);

  // Handle the state of resource and policy errors
  const [showResourceErrors, setShowResourceErrors] = useState(false);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const [resourceErrorModalOpen, setResourceErrorModalOpen] = useState(false);
  const [policyErrorModalOpen, setPolicyErrorModalOpen] = useState(false);

  // Get the metadata for Gitea
  const { data: repoStatus, refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);

  // Get metadata for policy
  const { refetch: refetchValidatePolicy } = useValidatePolicyQuery(org, app, resourceId);

  // Get metadata for resource
  const { refetch: refetchValidateResource } = useValidateResourceQuery(org, app, resourceId);

  const {
    data: loadedResourceData,
    refetch: refetchResource,
    isPending: resourcePending,
  } = useSinlgeResourceQuery(org, app, resourceId);

  const { data: accessList } = useGetAccessListQuery(org, accessListId, env);

  // Mutation function for editing a resource
  const { mutateAsync: editResource } = useEditResourceMutation(org, app, resourceId);

  // Set resourceData when loaded from server. Should only be called once
  useEffect(() => {
    if (!resourceData && loadedResourceData) {
      setResourceData(loadedResourceData);
    }
  }, [loadedResourceData, resourceData]);

  const debounceSave = (resource: Resource): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      editResource(resource);
    }, 400);
  };

  /**
   * Navigates to the selected page
   */
  const navigateToPage = async (page: NavigationBarPage) => {
    if (currentPage !== page) {
      await editResource(resourceData);
      await refetchResource();

      // Validate Resource and display errors + modal
      if (currentPage === 'about') {
        const data = await refetchValidateResource();
        const validationStatus = data?.data?.status ?? null;

        if (validationStatus === 200) {
          setShowResourceErrors(false);
          handleNavigation(page);
        } else {
          window.scrollTo(0, 0);
          setShowResourceErrors(true);
          setNextPage(page);
          setResourceErrorModalOpen(true);
        }
      }
      // Validate Ppolicy and display errors + modal
      else if (currentPage === 'policy') {
        const data = await refetchValidatePolicy();
        const validationStatus = data?.data?.status ?? null;

        if (validationStatus === 200) {
          setShowPolicyErrors(false);
          handleNavigation(page);
        } else {
          setShowPolicyErrors(true);
          setNextPage(page);
          setPolicyErrorModalOpen(true);
        }
      }
      // Else navigate
      else handleNavigation(page);
    }
  };

  /**
   * Handles the navigation from one page to another.
   *
   * @param newPage the page to navigate to
   */
  const handleNavigation = (newPage: NavigationBarPage) => {
    setPolicyErrorModalOpen(false);
    setResourceErrorModalOpen(false);
    refetchRepoStatus();
    navigate(getResourcePageURL(org, app, resourceId, newPage));
  };

  /**
   * Handles the navigation to a page that has erros. This is used from the deploy
   * page when information is displayed about errors on the policy or the resource page.
   *
   * @param page the page to navigate to
   */
  const navigateToPageWithError = async (page: NavigationBarPage) => {
    if (page === 'about') {
      await refetchResource();
      await refetchValidateResource();
      setShowResourceErrors(true);
    }
    if (page === 'policy') {
      setShowPolicyErrors(true);
    }
    handleNavigation(page);
  };

  const altinn2References = getAltinn2Reference(resourceData);
  /**
   * Decide if the migration page should be accessible or not
   */
  const isMigrateEnabled = (): boolean => {
    return !!altinn2References && shouldDisplayFeature('resourceMigration');
  };

  const aboutPageId = 'about';
  const policyPageId = 'policy';
  const deployPageId = 'deploy';
  const migrationPageId = 'migration';
  const accessListsPageId = 'accesslists';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutPageId,
      () => navigateToPage(aboutPageId),
      currentPage,
      getResourcePageURL(org, app, resourceId, 'about'),
    ),
    createNavigationTab(
      <GavelSoundBlockIcon className={classes.icon} />,
      policyPageId,
      () => navigateToPage(policyPageId),
      currentPage,
      getResourcePageURL(org, app, resourceId, 'policy'),
    ),
    createNavigationTab(
      <UploadIcon className={classes.icon} />,
      deployPageId,
      () => navigateToPage(deployPageId),
      currentPage,
      getResourcePageURL(org, app, resourceId, 'deploy'),
    ),
  ];

  const migrationTab: LeftNavigationTab = createNavigationTab(
    <MigrationIcon className={classes.icon} />,
    migrationPageId,
    () => navigateToPage(migrationPageId),
    currentPage,
    getResourcePageURL(org, app, resourceId, 'migration'),
  );

  /**
   * Gets the tabs to display. If showMigrate is true, the migration tab
   * is added, otherwise it displays the three initial tabs.
   *
   * @returns the tabs to display in the LeftNavigationBar
   */
  const getTabs = (): LeftNavigationTab[] => {
    return isMigrateEnabled() ? [...leftNavigationTabs, migrationTab] : leftNavigationTabs;
  };

  /**
   * Saves the resource
   */
  const handleSaveResource = (r: Resource) => {
    if (!deepCompare(resourceData, r)) {
      setResourceData(r);
      debounceSave(r);
    }
  };

  return (
    <div className={classes.resourceWrapper}>
      <div className={classes.leftNavWrapper}>
        <LeftNavigationBar
          upperTab='backButton'
          tabs={getTabs()}
          backLink={getResourceDashboardURL(org, app)}
          backLinkText={t('resourceadm.left_nav_bar_back')}
          selectedTab={
            currentPage === migrationPageId && !isMigrateEnabled() ? aboutPageId : currentPage
          }
        />
      </div>
      {resourcePending || !resourceData ? (
        <div className={classes.spinnerWrapper}>
          <Spinner
            size='xlarge'
            variant='interaction'
            title={t('resourceadm.about_resource_spinner')}
          />
        </div>
      ) : (
        <div className={classes.resourcePageWrapper}>
          {currentPage === aboutPageId && (
            <AboutResourcePage
              showAllErrors={showResourceErrors}
              resourceData={resourceData}
              onSaveResource={handleSaveResource}
              id='page-content-about'
            />
          )}
          {currentPage === policyPageId && (
            <PolicyEditorPage showAllErrors={showPolicyErrors} id='page-content-policy' />
          )}
          {currentPage === deployPageId && (
            <DeployResourcePage
              navigateToPageWithError={navigateToPageWithError}
              resourceVersionText={loadedResourceData?.version ?? ''}
              onSaveVersion={(version: string) =>
                handleSaveResource({
                  ...resourceData,
                  version: version?.trim(), // empty version is not allowed
                })
              }
              id='page-content-deploy'
            />
          )}
          {currentPage === migrationPageId && isMigrateEnabled() && (
            <MigrationPage
              id='page-content-migration'
              serviceCode={altinn2References[0]}
              serviceEdition={altinn2References[1]}
            />
          )}
          {currentPage === accessListsPageId && env && !accessListId && (
            <ResourceAccessLists env={env as EnvId} resourceData={resourceData} />
          )}
          {currentPage === accessListsPageId && env && accessList && (
            <AccessListDetail
              key={accessList.identifier}
              org={org}
              env={env}
              list={accessList}
              backUrl={`${getResourcePageURL(org, app, resourceId, 'accesslists')}/${env}`}
            />
          )}
        </div>
      )}
      {repoStatus?.hasMergeConflict && (
        <MergeConflictModal isOpen={repoStatus.hasMergeConflict} org={org} repo={app} />
      )}
      {policyErrorModalOpen && (
        <NavigationModal
          isOpen={policyErrorModalOpen}
          onClose={() => {
            setPolicyErrorModalOpen(false);
          }}
          onNavigate={() => handleNavigation(nextPage)}
          title={t('resourceadm.resource_navigation_modal_title_policy')}
        />
      )}
      {resourceErrorModalOpen && (
        <NavigationModal
          isOpen={resourceErrorModalOpen}
          onClose={() => {
            setResourceErrorModalOpen(false);
          }}
          onNavigate={() => handleNavigation(nextPage)}
          title={t('resourceadm.resource_navigation_modal_title_resource')}
        />
      )}
    </div>
  );
};
