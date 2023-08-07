import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType, ResourceBackendType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import {
  useRepoStatusQuery,
  useResourceSectorsQuery,
  useResourceThematicAreaEurovocQuery,
  useResourceThematicAreaLosQuery,
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

/**
 * Displays the 3 pages to manage resources and a left navigation bar.
 */
export const ResourcePage = () => {
  const navigate = useNavigate();

  const { pageType, resourceId, selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [currentPage, setCurrentPage] = useState<NavigationBarPageType>(
    pageType as NavigationBarPageType
  );
  // Stores the temporary next page
  const [nextPage, setNextPage] = useState<NavigationBarPageType>('about');

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
    resourceId
  );

  // Get metadata for resource
  const { refetch: refetchValidateResource } = useValidateResourceQuery(
    selectedContext,
    repo,
    resourceId
  );
  const {
    data: resourceData,
    refetch: refetchResource,
    isLoading: resourceLoading,
  } = useSinlgeResourceQuery(selectedContext, repo, resourceId);
  const { data: sectorsData, isLoading: sectorsLoading } = useResourceSectorsQuery(selectedContext);
  const { data: losData, isLoading: losLoading } = useResourceThematicAreaLosQuery(selectedContext);
  const { data: eurData, isLoading: eurLoading } =
    useResourceThematicAreaEurovocQuery(selectedContext);

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
    setCurrentPage(pageType as NavigationBarPageType);
  }, [pageType]);

  /**
   * Navigates to the selected page
   */
  const navigateToPage = async (page: NavigationBarPageType) => {
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
  const handleNavigation = (newPage: NavigationBarPageType) => {
    setCurrentPage(newPage);
    setPolicyErrorModalOpen(false);
    setResourceErrorModalOpen(false);
    refetch();
    navigate(getResourcePageURL(selectedContext, repo, resourceId, newPage));
  };

  /**
   * Takes the user back to where they came from
   */
  const goBack = () => {
    navigate(getResourceDashboardURL(selectedContext, repo));
  };

  /**
   * Handles the navigation to a page that has erros. This is used from the deploy
   * page when information is displayed about errors on the policy or the resource page.
   *
   * @param page the page to navigate to
   */
  const navigateToPageWithError = async (page: NavigationBarPageType) => {
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

  return (
    <div className={classes.resourceWrapper}>
      <div className={classes.leftNavWrapper}>
        <LeftNavigationBar
          currentPage={currentPage}
          navigateToPage={navigateToPage}
          goBack={goBack}
          showMigrate={getShowMigrate()}
        />
      </div>
      <div className={classes.resourcePageWrapper}>
        {currentPage === 'about' &&
          (resourceLoading || sectorsLoading || losLoading || eurLoading ? (
            <div className={classes.spinnerWrapper}>
              <Spinner size='3xLarge' variant='interaction' title='Laster inn ressurs' />
            </div>
          ) : (
            <AboutResourcePage
              showAllErrors={showResourceErrors}
              resourceData={resourceData}
              sectorsData={sectorsData}
              thematicData={[...losData, ...eurData]}
              onSaveResource={(r: ResourceBackendType) => {
                editResource(r, {
                  // TODO - Display that it was saved
                  onSuccess: () => {
                    console.log('success');
                  },
                });
              }}
            />
          ))}
        {currentPage === 'policy' && <PolicyEditorPage showAllErrors={showPolicyErrors} />}
        {currentPage === 'deploy' && (
          <DeployResourcePage navigateToPageWithError={navigateToPageWithError} />
        )}
        {currentPage === 'migration' && resourceData && resourceData.resourceReferences && (
          <MigrationPage />
        )}
      </div>
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
          onClose={() => setPolicyErrorModalOpen(false)}
          onNavigate={() => handleNavigation(nextPage)}
          title='Manglende informasjon i tilgangsregler'
        />
      )}
      {resourceErrorModalOpen && (
        <NavigationModal
          isOpen={resourceErrorModalOpen}
          onClose={() => setResourceErrorModalOpen(false)}
          onNavigate={() => handleNavigation(nextPage)}
          title='Manglende informasjon i ressurs'
        />
      )}
    </div>
  );
};
