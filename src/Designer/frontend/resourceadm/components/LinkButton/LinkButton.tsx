import type { ReactNode } from 'react';
import React from 'react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import { StudioLink } from '@studio/components-legacy';

export type LinkButtonProps = {
  /**
   * Page name
   */
  page: NavigationBarPage;
  /**
   * Function to handle the click of the link
   * @returns void
   */
  onClick?: (page: NavigationBarPage) => void;
  /**
   * Children of the component
   */
  children?: ReactNode;
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
export const LinkButton = ({ page, onClick, children }: LinkButtonProps): React.JSX.Element => {
  const handleButtonClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    onClick(page);
  };

  return (
    <StudioLink href={page} onClick={handleButtonClick}>
      {children}
    </StudioLink>
  );
};
