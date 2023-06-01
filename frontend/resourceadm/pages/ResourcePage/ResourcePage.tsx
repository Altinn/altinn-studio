import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditor } from '../PolicyEditor';

/**
 * Displays the 3 pages to manage resources and a left navigation bar.
 *
 * TODO - Error handling when invalid URL path. E.g., /about123 should display error or sent the user somewhere
 */
export const ResourcePage = () => {
  const navigate = useNavigate();
  const { pageType } = useParams();

  const [currentPage, setCurrentPage] = useState<NavigationBarPageType>(
    pageType as NavigationBarPageType
  );

  const navigateToPage = (page: NavigationBarPageType) => {
    setCurrentPage(page);
    navigate(`/resource/${page}`);
  };

  const goBack = () => {
    navigate('/');
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
