import React, { ReactNode } from 'react';
import classes from './GoBackButton.module.css';
import cn from 'classnames';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';

export type GoBackButtonProps = {
  /**
   * Classname for navigation element
   */
  className?: string;
  /**
   * Function to be executed when clicking the back button
   * @returns void
   */
  onClick: () => void;
  /**
   * Text on the back button
   */
  text: string;
};

/**
 * @component
 *    Displays the back button on top of the LeftNavigationBar
 *
 * @example
 *      <GoBackButton
 *        className={classes.navigationElement}
 *        onClick={onClickUpperTabBackButton}
 *        text={backButtonText}
 *      />
 *
 * @property {string}[className] - Classname for navigation element
 * @property {function}[onClick] - Function to be executed when clicking the back button
 * @property {string}[text] - Text on the back button
 *
 * @returns {ReactNode} - The rendered component
 */
export const GoBackButton = ({ className, onClick, text }: GoBackButtonProps): ReactNode => {
  return (
    <button className={cn(className, classes.backButton)} type='button' onClick={onClick}>
      <ArrowLeftIcon className={classes.icon} />
      <Paragraph size='small' short className={classes.buttonText}>
        {text}
      </Paragraph>
    </button>
  );
};
