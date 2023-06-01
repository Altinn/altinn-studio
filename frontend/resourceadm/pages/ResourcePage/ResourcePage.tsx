import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeftNavigationBar } from 'resourceadm/components/LeftNavigationBar';
import { NavigationBarPageType } from 'resourceadm/types/global';
import classes from './ResourcePage.module.css';
import { PolicyEditor } from '../PolicyEditor';

export const ResourcePage = () => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState<NavigationBarPageType>('about');

  const navigateToPage = (page: NavigationBarPageType) => {
    setCurrentPage(page);
  };

  const goBack = () => {
    navigate(-1);
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
