import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import { useRepoStatusQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { AboutResourcePage } from '../AboutResourcePage';

/**
 * Displays the 4 pages to manage resources and a left navigation bar.
 *
 * TODO - Error handling when invalid URL path. E.g., /about123 should display error or sent the user somewhere
 */
export const ResourcePage = () => {
  const navigate = useNavigate();

  const { pageType, resourceId, selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [currentPage, setCurrentPage] = useState<NavigationBarPageType>(
    pageType as NavigationBarPageType
  );

  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  // Get the status of the repo and the function to refetch it
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);

  /**
   * If repostatus is not undefined, set the flags for if the repo has merge
   * conflict and if the repo is in sync
   */
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus, currentPage]);

  /**
   * Navigates to the selected page
   */
  const navigateToPage = (page: NavigationBarPageType) => {
    setCurrentPage(page);
    refetch();
    navigate(getResourcePageURL(selectedContext, repo, resourceId, page));
  };

  /**
   * Takes the user back to where they came from
   */
  const goBack = () => {
    navigate(getResourceDashboardURL(selectedContext, repo));
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
        {currentPage === 'about' && <AboutResourcePage />}
        {currentPage === 'policy' && <PolicyEditorPage />}
        {currentPage === 'deploy' && <DeployResourcePage />}
      </div>
      {hasMergeConflict && (
        <MergeConflictModal
          isOpen={hasMergeConflict}
          handleSolveMerge={refetch}
          org={selectedContext}
          repo={repo}
        />
      )}
    </div>
  );
};
