import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import {
  useRepoStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { AboutResourcePage } from '../AboutResourcePage';
import { NavigationModal } from 'resourceadm/components/NavigationModal';

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

  // Get the metadata from the queries
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);
  const { data: validatePolicyData } = useValidatePolicyQuery(selectedContext, repo, resourceId);
  const { data: validateResourceData } = useValidateResourceQuery(
    selectedContext,
    repo,
    resourceId
  );

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
  const navigateToPage = (page: NavigationBarPageType) => {
    // Validate Resource and display errors + modal
    if (currentPage === 'about') {
      console.log(validateResourceData);
      if (validateResourceData.status === 200) {
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
      if (validatePolicyData && validatePolicyData.status === 200) {
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
  const navigateToPageWithError = (page: NavigationBarPageType) => {
    if (page === 'about') setShowResourceErrors(true);
    if (page === 'policy') setShowPolicyErrors(true);
    handleNavigation(page);
  };

  return (
    <div className={classes.resourceWrapper}>
      <div className={classes.leftNavWrapper}>
        <LeftNavigationBar
          currentPage={currentPage}
          navigateToPage={navigateToPage}
          goBack={goBack}
        />
      </div>
      <div className={classes.resourcePageWrapper}>
        {currentPage === 'about' && <AboutResourcePage showAllErrors={showResourceErrors} />}
        {currentPage === 'policy' && <PolicyEditorPage showAllErrors={showPolicyErrors} />}
        {currentPage === 'deploy' && (
          <DeployResourcePage navigateToPageWithError={navigateToPageWithError} />
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
          title='Manglende informasjon i policy'
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
