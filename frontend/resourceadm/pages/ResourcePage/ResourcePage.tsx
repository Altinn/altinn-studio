import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';

/**
 * Displays the 3 pages to manage resources and a left navigation bar.
 *
 * TODO - Error handling when invalid URL path. E.g., /about123 should display error or sent the user somewhere
 */
export const ResourcePage = () => {
  const navigate = useNavigate();

  const { pageType, resourceId, org, repo } = useParams();

  const [currentPage, setCurrentPage] = useState<NavigationBarPageType>(
    pageType as NavigationBarPageType
  );

  /**
   * Navigates to the selected page
   */
  const navigateToPage = (page: NavigationBarPageType) => {
    setCurrentPage(page);
    navigate(getResourcePageURL(org, repo, resourceId, page));
  };

  /**
   * Takes the user back to where they came from
   */
  const goBack = () => {
    navigate(getResourceDashboardURL(org, repo));
  };

  return (
    <div className={classes.resourceWrapper}>
      <LeftNavigationBar
        currentPage={currentPage}
        navigateToPage={navigateToPage}
        goBack={goBack}
      />
      <div className={classes.resourcePageWrapper}>
        {currentPage === 'about' && (
          <div className={classes.resourcePage}>
            <h2 className={classes.resourceH2}>Om ressursen - TODO sett inn komponent</h2>
          </div>
        )}
        {currentPage === 'security' && (
          <div className={classes.resourcePage}>
            <h2 className={classes.resourceH2}>Sikkerhet - TODO sett inn komponent</h2>
          </div>
        )}
        {currentPage === 'policy' && <PolicyEditorPage />}
      </div>
    </div>
  );
};
