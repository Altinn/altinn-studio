import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { EditButton } from 'src/components/summary/EditButton';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';

export interface SummaryBoilerplateProps extends Omit<ILayoutCompSummary, 'type' | 'id'> {
  hasValidationMessages?: boolean;
  onChangeClick: () => void;
  changeText: string | null;
  label: any;
  readOnlyComponent?: boolean;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    fontSize: '1.125rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.125rem',
    },
  },
  labelWithError: {
    color: AltinnAppTheme.altinnPalette.primary.red,
    '& p': {
      color: AltinnAppTheme.altinnPalette.primary.red,
    },
  },
});
export function SummaryBoilerplate({
  hasValidationMessages,
  onChangeClick,
  changeText,
  label,
  readOnlyComponent,
  display,
}: SummaryBoilerplateProps) {
  const classes = useStyles();
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  return (
    <>
      <Grid
        item={true}
        xs={10}
        {...(hasValidationMessages && {
          'data-testid': 'has-validation-message',
        })}
      >
        <Typography
          variant='body1'
          className={cn(hasValidationMessages && !display?.hideValidationMessages && classes.labelWithError)}
          component='span'
        >
          {label}
        </Typography>
      </Grid>
      <Grid
        item
        xs={2}
      >
        {shouldShowChangeButton && (
          <EditButton
            onClick={onChangeClick}
            editText={changeText}
          />
        )}
      </Grid>
    </>
  );
}
