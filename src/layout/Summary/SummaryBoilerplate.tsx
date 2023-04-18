import React from 'react';

import { makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { EditButton } from 'src/layout/Summary/EditButton';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface SummaryBoilerplateProps {
  onChangeClick: () => void;
  changeText: string | null;
  label: React.ReactNode;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNode;
  overrides: ISummaryComponent['overrides'];
}

const useStyles = makeStyles({
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
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
      <div className={classes.container}>
        <Typography
          variant='body1'
          className={cn(hasValidationMessages && !display?.hideValidationMessages && classes.labelWithError)}
          component='span'
          {...(hasValidationMessages && {
            'data-testid': 'has-validation-message',
          })}
        >
          {label}
        </Typography>

        {shouldShowChangeButton && (
          <EditButton
            onClick={onChangeClick}
            editText={changeText}
            label={getPlainTextFromNode(label)}
          />
        )}
      </div>
    </>
  );
}
