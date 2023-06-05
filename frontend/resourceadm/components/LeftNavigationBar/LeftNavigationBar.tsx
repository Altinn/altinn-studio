import React from 'react';
import classes from './LeftNavigationBar.module.css';
import { InformationSquareIcon, ShieldLockIcon, GavelSoundBlockIcon } from '@navikt/aksel-icons';
import { NavigationBarPageType } from 'resourceadm/types/global';

interface Props {
  currentPage: NavigationBarPageType;
  navigateToPage: (page: NavigationBarPageType) => void;
  goBack: () => void;
}

/**
 * Displays a navigation bar component to the left of the screen.
 * This navigation bar contains 3 elements: "about", "security", "policy"
 *
 * @param props.currentPage the currentPage displayed
 * @param props.navigateToPage function that navigates to another page in the navbar
 * @param props.goBack function to go back
 */
export const LeftNavigationBar = ({ currentPage, navigateToPage, goBack }: Props) => {
  const getNavElementClass = (page: NavigationBarPageType) => {
    return currentPage === page ? classes.navigationElementSelected : classes.navigationElement;
  };

  return (
    <div className={classes.navigationBar}>
      <button className={classes.backButton} type='button' onClick={goBack}>
        <p className={classes.buttonText}>Tilbake til dashboard</p>
      </button>
      <div className={classes.navigationElements}>
        <button className={getNavElementClass('about')} onClick={() => navigateToPage('about')}>
          <InformationSquareIcon className={classes.icon} title='Om ressursen' fontSize='1.8rem' />
          <p className={classes.buttonText}>Om ressursen</p>
        </button>
        <button
          className={getNavElementClass('security')}
          onClick={() => navigateToPage('security')}
        >
          <ShieldLockIcon className={classes.icon} title='Sikkerhet' fontSize='1.8rem' />
          <p className={classes.buttonText}>Sikkerhet</p>
        </button>
        <button className={getNavElementClass('policy')} onClick={() => navigateToPage('policy')}>
          <GavelSoundBlockIcon className={classes.icon} title='Policy' fontSize='1.8rem' />
          <p className={classes.buttonText}>Policy</p>
        </button>
      </div>
    </div>
  );
};
