import type { PropsWithChildren } from 'react';

import { Tag } from '@digdir/designsystemet-react';

import classes from './IndicatorTag.module.css';

export type IndicatorTagProps = {
  color: 'warning' | 'info';
};

/**
 * The tag shown after a field label to say whether the field must be filled out or is optional.
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
