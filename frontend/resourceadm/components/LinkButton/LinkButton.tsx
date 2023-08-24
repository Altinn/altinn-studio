import React from 'react';
import classes from './LinkButton.module.css';
import { Link } from '@digdir/design-system-react';

type LinkButtonProps = {
  /**
   * Function to handle the click of the link
   * @returns void
   */
  onClick?: () => void;
  /**
   * Children of the component
   */
  children: React.ReactNode;
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
 * @property {React.ReactNode}[children] - Children of the component
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const LinkButton = ({ onClick, children }: LinkButtonProps): React.ReactNode => {
  return (
    <Link as='button' onClick={onClick} className={classes.linkButton}>
      {children}
    </Link>
  );
};
