import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { EditButton } from 'src/components/summary/EditButton';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ISummaryComponent } from 'src/components/summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/hierarchy';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface SummaryBoilerplateProps {
  onChangeClick: () => void;
  changeText: string | null;
  label: any;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNode;
  overrides: ISummaryComponent['overrides'];
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
  onChangeClick,
  changeText,
  label,
  summaryNode,
  targetNode,
  overrides,
}: SummaryBoilerplateProps) {
  const classes = useStyles();
  const display = overrides?.display || summaryNode.item.display;
  const readOnlyComponent = targetNode.item.readOnly === true;
  const hasValidationMessages = targetNode.hasValidationMessages();
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
