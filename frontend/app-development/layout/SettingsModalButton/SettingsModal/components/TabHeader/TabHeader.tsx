import type { ReactNode } from 'react';
import React from 'react';
import classes from './TabHeader.module.css';
import { Heading } from '@digdir/design-system-react';

export type TabHeaderProps = {
  /**
   * The text in the header
   */
  text: string;
};

/**
 * @component
 *    Displays the Heading in a Tab in the Settings Modal
 *
 * @example
 *    <TabHeader text='Heaeding text' />
 *
 * @property {string}[text] - The text in the header
 *
 * @returns {ReactNode} - The rendered heading
 */
export const TabHeader = ({ text }: TabHeaderProps): ReactNode => {
  return (
    <Heading level={2} spacing size='xsmall' className={classes.heading}>
      {text}
    </Heading>
  );
};
