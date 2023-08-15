import React from 'react';
import cn from 'classnames';
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
  /**
   * The currentPage displayed
   */
  currentPage: NavigationBarPageType;
  /**
   * Function that navigates to another page in the navbar
   * @param page the page to navigate to
   * @returns void
   */
  navigateToPage: (page: NavigationBarPageType) => void;
  /**
   * Function to go back to dashboard
   * @returns void
   */
  goBack: () => void;
  /**
   * Flag for if the migrate tab should be shown
   */
  showMigrate?: boolean;
  /**
   * The page clicked in the menu
   */
  newPageClicked: NavigationBarPageType;
}

/**
 * @component
 *    Displays a navigation bar component to the left of the screen.
 *    This navigation bar contains 3 elements: "about", "policy", "deploy"
 *
 * @example
 *    <LeftNavigationBar
 *        currentPage={currentPage}
 *        navigateToPage={navigateToPage}
 *        goBack={goBack}
 *        newPageClicked={newPageClicked}
 *    />
 *
 * @property {NavigationBarPageType}[currentPage] - The currentPage displayed
 * @property {function}[navigateToPage] - Function that navigates to another page in the navbar
 * @property {function}[goBack] - Function to go back to dashboard
 * @property {boolean}[showMigrate] - Flag for if the migrate tab should be shown
 * @property {NavigationBarPageType}[newPageClicked] - The page clicked in the menu
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const LeftNavigationBar = ({
  currentPage,
  navigateToPage,
  goBack,
  showMigrate = false,
  newPageClicked,
}: Props): React.ReactNode => {
  return (
    <div className={classes.navigationBar}>
      <div className={classes.navigationElements}>
        <button
          className={cn(classes.navigationElement, classes.backButton)}
          type='button'
          onClick={goBack}
        >
          <ArrowLeftIcon className={classes.icon} title='Tilbake til dashboard' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Tilbake til dashboard
          </Paragraph>
        </button>
        <button
          className={cn(
            classes.navigationElement,
            currentPage === 'about' && classes.selected,
            newPageClicked === 'about' && classes.newPage
          )}
          onClick={() => navigateToPage('about')}
        >
          <InformationSquareIcon className={classes.icon} title='Om ressursen' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Om ressursen
          </Paragraph>
        </button>
        <button
          className={cn(
            classes.navigationElement,
            currentPage === 'policy' && classes.selected,
            newPageClicked === 'policy' && classes.newPage
          )}
          onClick={() => navigateToPage('policy')}
        >
          <GavelSoundBlockIcon className={classes.icon} title='Policy' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Tilgangsregler
          </Paragraph>
        </button>
        <button
          className={cn(
            classes.navigationElement,
            currentPage === 'deploy' && classes.selected,
            newPageClicked === 'deploy' && classes.newPage
          )}
          onClick={() => navigateToPage('deploy')}
        >
          <UploadIcon className={classes.icon} title='Deploy' fontSize='1.8rem' />
          <Paragraph size='small' short className={classes.buttonText}>
            Publiser
          </Paragraph>
        </button>
        {showMigrate && (
          <button
            className={cn(
              classes.navigationElement,
              currentPage === 'migration' && classes.selected,
              newPageClicked === 'migration' && classes.newPage
            )}
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
