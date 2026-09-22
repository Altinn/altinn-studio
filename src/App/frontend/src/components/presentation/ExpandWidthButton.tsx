import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { ExpandIcon, ShrinkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/components/presentation/ExpandWidthButton.module.css';
import { useExpandedWidth } from 'src/features/form/layout/useExpandedWidth';
import { Lang } from 'src/features/language/Lang';

export function ExpandWidthButton(props: Parameters<typeof Button>[0]) {
  const { expandedWidth, toggleExpandedWidth } = useExpandedWidth();

  return (
    <Button
      data-testid='form-expand-button'
      onClick={toggleExpandedWidth}
      variant='tertiary'
      color='first'
      data-size='sm'
      {...props}
      className={cn(classes.expandWidthButton, props.className)}
    >
      {expandedWidth ? (
        <>
          <ShrinkIcon
            className={classes.expandWidthIcon}
            aria-hidden
          />
          <Lang id='general.standard_width' />
        </>
      ) : (
        <>
          <ExpandIcon
            className={classes.expandWidthIcon}
            aria-hidden
          />
          <Lang id='general.full_width' />
        </>
      )}
    </Button>
  );
}
