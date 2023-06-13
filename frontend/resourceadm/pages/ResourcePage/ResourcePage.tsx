import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { AboutResourceOld } from '../AboutResourceOld';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import { useRepoStatusQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';

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
  const [isLocalRepoInSync, setIsLocalRepoInSync] = useState(false);

  // Get the status of the repo and the function to refetch it
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);

  /**
   * If repostatus is not undefined, set the flags for if the repo has merge
   * conflict and if the repo is in sync
   */
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
      setIsLocalRepoInSync(
        ((repoStatus.behindBy === 0 || repoStatus.behindBy === null) && repoStatus.aheadBy === 0) ||
          repoStatus.aheadBy === null
      );
    }
  }, [repoStatus]);

  /**
   * Navigates to the selected page
   */
  const navigateToPage = (page: NavigationBarPageType) => {
    setCurrentPage(page);
    console.log(repoStatus);
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
      <LeftNavigationBar
        currentPage={currentPage}
        navigateToPage={navigateToPage}
        goBack={goBack}
      />
      <div className={classes.resourcePageWrapper}>
        {currentPage === 'about' && <AboutResourceOld />}
        {currentPage === 'security' && (
          <div className={classes.resourcePage}>
            <h2 className={classes.resourceH2}>Sikkerhet - TODO sett inn komponent</h2>
          </div>
        )}
        {currentPage === 'policy' && <PolicyEditorPage />}
        {currentPage === 'deploy' && <DeployResourcePage isLocalRepoInSync={isLocalRepoInSync} />}
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
