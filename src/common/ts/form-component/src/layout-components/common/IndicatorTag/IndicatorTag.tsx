import type { PropsWithChildren } from 'react';

import { Tag } from '@digdir/designsystemet-react';

import classes from './IndicatorTag.module.css';

export type IndicatorKind = 'required' | 'optional';

export type IndicatorTagProps = {
  kind: IndicatorKind;
};

const colors: Record<IndicatorKind, 'warning' | 'info'> = {
  required: 'warning',
  optional: 'info',
};

/**
 * The tag shown after a field label to say whether the field must be filled out or is optional.
 * `data-indicator` lets Studio find the tag, so a click on it can change whether the field is required.
 */
export function IndicatorTag({ kind, children }: PropsWithChildren<IndicatorTagProps>) {
  return (
    <>
      {' '}
      <Tag
        data-color={colors[kind]}
        data-size='sm'
        data-indicator={kind}
        className={classes.indicatorTag}
      >
        {children}
      </Tag>
    </>
  );
}
