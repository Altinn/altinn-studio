import React, { useEffect, useState } from 'react';
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
import { Spinner } from '@digdir/design-system-react';
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
import { createNavigationTab } from '../../utils/resourceUtils';
import { ResourceAccessLists } from '../../components/ResourceAccessLists';
import { AccessListDetail } from '../../components/AccessListDetails';
import { useGetAccessListQuery } from '../../hooks/queries/useGetAccessListQuery';
import { useUrlParams } from '../../hooks/useSelectedContext';

/**
 * @component
 *    Displays the 4 pages to manage resources and a left navigation bar.
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourcePage = (): React.JSX.Element => {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const { pageType, resourceId, selectedContext, repo, env, accessListId } = useUrlParams();

  const [currentPage, setCurrentPage] = useState<NavigationBarPage>(pageType as NavigationBarPage);

  // Stores the temporary next page
  const [nextPage, setNextPage] = useState<NavigationBarPage>('about');

  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  // Handle the state of resource and policy errors
  const [showResourceErrors, setShowResourceErrors] = useState(false);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const [resourceErrorModalOpen, setResourceErrorModalOpen] = useState(false);
  const [policyErrorModalOpen, setPolicyErrorModalOpen] = useState(false);

  // Get the metadata for Gitea
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);

  // Get metadata for policy
  const { refetch: refetchValidatePolicy } = useValidatePolicyQuery(
    selectedContext,
    repo,
    resourceId,
  );

  // Get metadata for resource
  const { refetch: refetchValidateResource } = useValidateResourceQuery(
    selectedContext,
    repo,
    resourceId,
  );

  const {
    data: resourceData,
    refetch: refetchResource,
    isPending: resourcePending,
  } = useSinlgeResourceQuery(selectedContext, repo, resourceId);

  const { data: accessList } = useGetAccessListQuery(selectedContext, accessListId, env);

  // Mutation function for editing a resource
  const { mutate: editResource } = useEditResourceMutation(selectedContext, repo, resourceId);

  /**
   * If repostatus is not undefined, set the flags for if the repo has merge
   * conflict and if the repo is in sync
   */
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus]);

  /**
   * Check if the pageType parameter has changed and update the currentPage
   */
  useEffect(() => {
    setCurrentPage(pageType as NavigationBarPage);
  }, [pageType]);

  /**
   * Navigates to the selected page
   */
  const navigateToPage = async (page: NavigationBarPage) => {
    if (currentPage !== page) {
      await refetchResource();

      // Validate Resource and display errors + modal
      if (currentPage === 'about') {
        const data = await refetchValidateResource();
        const validationStatus = data?.data?.status ?? null;

        if (validationStatus === 200) {
          setShowResourceErrors(false);
          handleNavigation(page);
        } else {
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
    setCurrentPage(newPage);
    setPolicyErrorModalOpen(false);
    setResourceErrorModalOpen(false);
    refetch();
    navigate(getResourcePageURL(selectedContext, repo, resourceId, newPage));
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
    if (page === 'policy') setShowPolicyErrors(true);
    handleNavigation(page);
  };

  /**
   * Decide if the migration page should be accessible or not
   */
  const isMigrateEnabled = (): boolean => {
    const hasAltinn2ReferenceSource = resourceData?.resourceReferences?.some(
      (ref) => ref.referenceSource === 'Altinn2',
    );
    return hasAltinn2ReferenceSource;
  };

  const aboutPageId = 'about';
  const policyPageId = 'policy';
  const deployPageId = 'deploy';
  const migrationPageId = 'migration';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutPageId,
      () => navigateToPage(aboutPageId),
      currentPage,
      getResourcePageURL(selectedContext, repo, resourceId, 'about'),
    ),
    createNavigationTab(
      <GavelSoundBlockIcon className={classes.icon} />,
      policyPageId,
      () => navigateToPage(policyPageId),
      currentPage,
      getResourcePageURL(selectedContext, repo, resourceId, 'policy'),
    ),
    createNavigationTab(
      <UploadIcon className={classes.icon} />,
      deployPageId,
      () => navigateToPage(deployPageId),
      currentPage,
      getResourcePageURL(selectedContext, repo, resourceId, 'deploy'),
    ),
  ];

  const migrationTab: LeftNavigationTab = createNavigationTab(
    <MigrationIcon className={classes.icon} />,
    migrationPageId,
    () => navigateToPage(migrationPageId),
    currentPage,
    getResourcePageURL(selectedContext, repo, resourceId, 'migration'),
  );

  /**
   * Gets the tabs to display. If showMigrate is true, the migration tab
   * is added, otherwise it displays the three initial tabs.
   *
   * @returns the tabs to display in the LeftNavigationBar
   */
  const getTabs = (): LeftNavigationTab[] => {
    if (isMigrateEnabled() && !leftNavigationTabs.includes(migrationTab)) {
      return [...leftNavigationTabs, migrationTab];
    } else {
      return leftNavigationTabs;
    }
  };

  /**
   * Saves the resource
   */
  const handleSaveResource = async (r: Resource) => {
    editResource(r);
    await refetch();
    await refetchResource();
  };

  return (
    <div className={classes.resourceWrapper}>
      <div className={classes.leftNavWrapper}>
        <LeftNavigationBar
          upperTab='backButton'
          tabs={getTabs()}
          backLink={`${getResourceDashboardURL(selectedContext, repo)}`}
          backLinkText={t('resourceadm.left_nav_bar_back')}
          selectedTab={currentPage}
        />
      </div>
      {resourcePending ? (
        <div className={classes.spinnerWrapper}>
          <Spinner
            size='xlarge'
            variant='interaction'
            title={t('resourceadm.about_resource_spinner')}
          />
        </div>
      ) : (
        <div className={classes.resourcePageWrapper}>
          {currentPage === 'about' && (
            <AboutResourcePage
              showAllErrors={showResourceErrors}
              resourceData={resourceData}
              onSaveResource={handleSaveResource}
              id='page-content-about'
            />
          )}
          {currentPage === 'policy' && (
            <PolicyEditorPage showAllErrors={showPolicyErrors} id='page-content-policy' />
          )}
          {currentPage === 'deploy' && (
            <DeployResourcePage
              navigateToPageWithError={navigateToPageWithError}
              resourceVersionText={resourceData?.version ?? ''}
              onSaveVersion={(version: string) =>
                handleSaveResource({
                  ...resourceData,
                  version,
                })
              }
              id='page-content-deploy'
            />
          )}
          {currentPage === 'migration' && isMigrateEnabled() && (
            <MigrationPage
              navigateToPageWithError={navigateToPageWithError}
              id='page-content-migration'
            />
          )}
          {currentPage === 'accesslists' && env && !accessListId && (
            <ResourceAccessLists env={env} resourceData={resourceData} />
          )}
          {currentPage === 'accesslists' && env && accessList && (
            <AccessListDetail
              org={selectedContext}
              env={env}
              list={accessList}
              backUrl={`${getResourcePageURL(
                selectedContext,
                repo,
                resourceId,
                'accesslists',
              )}/${env}`}
            />
          )}
        </div>
      )}
      {hasMergeConflict && (
        <MergeConflictModal
          isOpen={hasMergeConflict}
          handleSolveMerge={refetch}
          org={selectedContext}
          repo={repo}
        />
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
