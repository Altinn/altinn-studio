import React from 'react';
import classes from './LeftNavigationBar.module.css';
import {
  InformationSquareIcon,
  GavelSoundBlockIcon,
  UploadIcon,
  ArrowLeftIcon,
  MigrationIcon,
} from '@navikt/aksel-icons';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { Paragraph } from '@digdir/design-system-react';

interface Props {
  currentPage: NavigationBarPageType;
  navigateToPage: (page: NavigationBarPageType) => void;
  goBack: () => void;
  showMigrate?: boolean;
}

/**
 * Displays a navigation bar component to the left of the screen.
 * This navigation bar contains 3 elements: "about", "policy", "deploy"
 *
 * @param props.currentPage the currentPage displayed
 * @param props.navigateToPage function that navigates to another page in the navbar
 * @param props.goBack function to go back
 */
export const LeftNavigationBar = ({
  currentPage,
  navigateToPage,
  goBack,
  showMigrate = false,
}: Props) => {
  return (
    <div className={classes.navigationBar}>
      <div className={classes.navigationElements}>
        <button
          className={`${classes.navigationElement} ${classes.backButton} `}
          type='button'
          onClick={goBack}
        >
          <ArrowLeftIcon className={classes.icon} title='Tilbake til dashboard' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Tilbake til dashboard
          </Paragraph>
        </button>
        <button
          className={`${classes.navigationElement} ${currentPage === 'about' && classes.selected} `}
          onClick={() => navigateToPage('about')}
        >
          <InformationSquareIcon className={classes.icon} title='Om ressursen' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Om ressursen
          </Paragraph>
        </button>
        <button
          className={`${classes.navigationElement}
            ${currentPage === 'policy' && classes.selected} `}
          onClick={() => navigateToPage('policy')}
        >
          <GavelSoundBlockIcon className={classes.icon} title='Policy' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Tilgangsregler
          </Paragraph>
        </button>
        <button
          className={`${classes.navigationElement} ${
            currentPage === 'deploy' && classes.selected
          } `}
          onClick={() => navigateToPage('deploy')}
        >
          <UploadIcon className={classes.icon} title='Deploy' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Publiser
          </Paragraph>
        </button>
        {showMigrate && (
          <button
            className={`${classes.navigationElement} ${
              currentPage === 'migration' && classes.selected
            } `}
            onClick={() => navigateToPage('migration')}
          >
            <MigrationIcon className={classes.icon} title='Migrer' fontSize='1.8rem' />
            <Paragraph size='small' short className={classes.buttonText}>
              Migrer
            </Paragraph>
          </button>
        )}
      </div>
    </div>
  );
};
