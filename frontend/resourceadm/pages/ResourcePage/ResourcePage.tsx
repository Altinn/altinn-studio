import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { NavigationBarPage } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import {
  useSinlgeResourceQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { AboutResourcePage } from '../AboutResourcePage';
import { NavigationModal } from 'resourceadm/components/NavigationModal';
import { Spinner } from '@digdir/design-system-react';
import { useEditResourceMutation } from 'resourceadm/hooks/mutations';
import { MigrationPage } from '../MigrationPage';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import {
  GavelSoundBlockIcon,
  InformationSquareIcon,
  MigrationIcon,
  UploadIcon,
} from '@navikt/aksel-icons';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { createNavigationTab } from 'resourceadm/utils/resourceUtils';

/**
 * @component
 *    Displays the 4 pages to manage resources and a left navigation bar.
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourcePage = (): React.ReactNode => {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const { pageType, resourceId, selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [currentPage, setCurrentPage] = useState<NavigationBarPage>(pageType as NavigationBarPage);

  // Stores the temporary next page
  const [nextPage, setNextPage] = useState<NavigationBarPage>('about');

  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  // Handle the state of resource and policy errors
  const [showResourceErrors, setShowResourceErrors] = useState(false);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);

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

  // Mutation function for editing a resource
  const { mutate: editResource } = useEditResourceMutation(selectedContext, repo, resourceId);

  const resourceErrorModalRef = useRef<HTMLDialogElement>(null);
  const policyErrorModalRef = useRef<HTMLDialogElement>(null);
  const mergeConflictModalRef = useRef<HTMLDialogElement>(null);

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

  // Open the modal when there is a merge conflict
  useEffect(() => {
    if (hasMergeConflict && mergeConflictModalRef.current) {
      mergeConflictModalRef.current.showModal();
    }
  }, [hasMergeConflict]);

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
          resourceErrorModalRef.current?.showModal();
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
          policyErrorModalRef.current?.showModal();
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
    policyErrorModalRef.current?.close();
    resourceErrorModalRef.current?.close();
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
  const getShowMigrate = () => {
    if (resourceData) {
      if (resourceData.resourceReferences) return true;
      return false;
    }
    return false;
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
    if (getShowMigrate() && !leftNavigationTabs.includes(migrationTab)) {
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
          {currentPage === 'migration' && resourceData && resourceData.resourceReferences && (
            <MigrationPage
              navigateToPageWithError={navigateToPageWithError}
              id='page-content-migration'
            />
          )}
        </div>
      )}
      <MergeConflictModal
        ref={mergeConflictModalRef}
        handleSolveMerge={refetch}
        org={selectedContext}
        repo={repo}
      />
      <NavigationModal
        ref={policyErrorModalRef}
        onClose={() => {
          policyErrorModalRef.current?.close();
        }}
        onNavigate={() => handleNavigation(nextPage)}
        title={t('resourceadm.resource_navigation_modal_title_policy')}
      />
      <NavigationModal
        ref={resourceErrorModalRef}
        onClose={() => {
          resourceErrorModalRef.current?.close();
        }}
        onNavigate={() => handleNavigation(nextPage)}
        title={t('resourceadm.resource_navigation_modal_title_resource')}
      />
    </div>
  );
};
