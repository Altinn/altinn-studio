import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditor } from '../PolicyEditor';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { get } from 'app-shared/utils/networking';
import { getPolicyRulesUrl } from 'resourceadm/utils/backendUrlUtils/backendUserUtils';

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

  // legg på param for å kjøre mot backend eller mock.
  const a = () => {
    get(getPolicyRulesUrl('ttd', 'resourceadm-resources', 'resourceId3')).then((res) => {
      console.log(res);
    });
  };

  useEffect(() => {
    a();
  });

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
        {currentPage === 'about' && <h1>Om ressursen - TODO sett inn komponent</h1>}
        {currentPage === 'security' && <h1>Sikkerhet - TODO sett inn komponent</h1>}
        {currentPage === 'policy' && <PolicyEditor />}
      </div>
    </div>
  );
};
