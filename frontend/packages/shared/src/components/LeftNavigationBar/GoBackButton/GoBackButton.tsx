import React, { ReactNode } from 'react';
import classes from './GoBackButton.module.css';
import cn from 'classnames';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';

export type GoBackButtonProps = {
  /**
   * Classname for navigation element
   */
  navElementClassName: string;
  /**
   * Function to be executed when clicking the back button
   * @returns void
   */
  onClickBackButton: () => void;
  /**
   * Text on the back button
   */
  backButtonText: string;
};

/**
 * @component
 *    Displays the back button on top of the LeftNavigationBar
 *
 * @example
 *      <GoBackButton
 *        navElementClassName={classes.navigationElement}
 *        onClickBackButton={onClickUpperTabBackButton}
 *        backButtonText={backButtonText}
 *      />
 *
 * @property {string}[navElementClassName] - Classname for navigation element
 * @property {function}[onClickBackButton] - Function to be executed when clicking the back button
 * @property {string}[backButtonText] - Text on the back button
 *
 * @returns {ReactNode} - The rendered component
 */
export const GoBackButton = ({
  navElementClassName,
  onClickBackButton,
  backButtonText,
}: GoBackButtonProps): ReactNode => {
  return (
    <button
      className={cn(navElementClassName, classes.backButton)}
      type='button'
      onClick={onClickBackButton}
    >
      <ArrowLeftIcon className={classes.icon} />
      <Paragraph size='small' short className={classes.buttonText}>
        {backButtonText}
      </Paragraph>
    </button>
  );
};
