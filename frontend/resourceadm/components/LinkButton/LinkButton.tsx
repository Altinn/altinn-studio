import type { ReactNode } from 'react';
import React from 'react';
import classes from './LinkButton.module.css';
import { Link } from '@digdir/design-system-react';

export type LinkButtonProps = {
  /**
   * Function to handle the click of the link
   * @returns void
   */
  onClick?: () => void;
  /**
   * Children of the component
   */
  children: ReactNode;
};

/**
 * @component
 *    Link component that behaves like a button
 *
 * @example
 *    <LinkButton onClick={handleOnClick}>
 *       Children goes here
 *    </LinkButton>
 *
 * @property {function}[text] - Function to handle the click of the link
 * @property {React.JSX.Element | string}[children] - Children of the component
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const LinkButton = ({ onClick, children }: LinkButtonProps): React.JSX.Element => {
  return (
    <Link as='button' onClick={onClick} className={classes.linkButton}>
      {children}
    </Link>
  );
};
