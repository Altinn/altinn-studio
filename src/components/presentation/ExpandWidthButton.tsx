import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { FullscreenEnter, FullscreenExit } from '@navikt/ds-icons';
import cn from 'classnames';

import classes from 'src/components/presentation/ExpandWidthButton.module.css';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { Lang } from 'src/features/language/Lang';

export function ExpandWidthButton(props: Parameters<typeof Button>[0]) {
  const { expandedWidth, toggleExpandedWidth } = useUiConfigContext();

  return (
    <Button
      data-testid='form-expand-button'
      onClick={toggleExpandedWidth}
      variant='tertiary'
      color='first'
      size='sm'
      {...props}
      className={cn(classes.expandWidthButton, props.className)}
    >
      {expandedWidth ? (
        <>
          <FullscreenExit
            className={classes.expandWidthIcon}
            aria-hidden
          />
          <Lang id='general.standard_width' />
        </>
      ) : (
        <>
          <FullscreenEnter
            className={classes.expandWidthIcon}
            aria-hidden
          />
          <Lang id='general.full_width' />
        </>
      )}
    </Button>
  );
}
