import type { PropsWithChildren } from 'react';

import { Tag } from '@digdir/designsystemet-react';

import classes from './IndicatorTag.module.css';

export type IndicatorTagProps = {
  /** `warning` (yellow) marks a required field, `info` (blue) an optional one, as recommended by Designsystemet. */
  color: 'warning' | 'info';
};

/**
 * The tag shown after a field label to say whether the field must be filled out or is optional. Follows
 * the Designsystemet pattern for required and optional fields:
 * https://designsystemet.no/no/patterns/required-and-optional-fields
 *
 * A space is rendered before the tag so the accessible name of the field reads naturally
 * ("Postnr Må fylles ut") instead of running the label and the tag together.
 */
export function IndicatorTag({ color, children }: PropsWithChildren<IndicatorTagProps>) {
  return (
    <>
      {' '}
      <Tag data-color={color} data-size='sm' className={classes.indicatorTag}>
        {children}
      </Tag>
    </>
  );
}
