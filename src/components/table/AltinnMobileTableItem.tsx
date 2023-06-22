import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Grid, makeStyles, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@material-ui/core';
import { Edit as EditIcon, Warning as WarningIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { useIsMobile } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { AltinnStudioTheme } from 'src/theme/altinnStudioTheme';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ITextResourceBindings } from 'src/types';

export interface IMobileTableItem {
  key: React.Key;
  label: React.ReactNode;
  value: string;
}

export interface IAltinnMobileTableItemProps {
  items: IMobileTableItem[];
  tableItemIndex: number;
  container?: ILayoutGroup;
  valid?: boolean;
  editIndex: number;
  onEditClick: () => void;
  getEditButtonText?: (
    isEditing: boolean,
    langTools: IUseLanguage,
    textResourceBindings?: ITextResourceBindings,
  ) => string;
  editButtonText?: string;
}

const useStyles = makeStyles({
  tableContainer: {
    borderBottom: `1px solid ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  table: {
    tableLayout: 'fixed',
    marginTop: '0.75rem',
    marginBottom: '0.75rem',
    '& tr': {
      '& td': {
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        maxWidth: '50%',
        minWidth: '50%',
        padding: '0 0 0 24px',
        border: 'none',
      },
    },
  },
  tableRowError: {
    backgroundColor: '#F9CAD3;',
  },
  labelText: {
    color: AltinnStudioTheme.altinnPalette.primary.grey,
  },
  editButtonCell: {
    width: '185px',
    padding: '4px !important',
    '@media (max-width: 768px)': {
      width: '50px',
    },
  },
  tableButtonWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'right',
  },
  textContainer: {
    width: '100%',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  editingRow: {
    backgroundColor: AltinnStudioTheme.palette.secondary.transparentBlue,
    borderTop: `2px dotted ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    marginTop: '-1px',
    borderBottom: 0,
    boxSizing: 'border-box',
    '& tbody': {
      backgroundColor: AltinnStudioTheme.palette.secondary.transparentBlue,
    },
  },
  aboveEditingRow: {
    borderBottom: 0,
  },
});

export function AltinnMobileTableItem({
  items,
  tableItemIndex,
  container,
  valid = true,
  editIndex,
  onEditClick,
  getEditButtonText,
  editButtonText,
}: IAltinnMobileTableItemProps) {
  const classes = useStyles();
  const mobileViewSmall = useIsMobile();
  const langTools = useLanguage();
  const { langAsString } = langTools;

  const node = useResolvedNode(container);
  const expressionsForRow =
    node?.isRepGroup() && node.item.rows[tableItemIndex]?.groupExpressions
      ? node.item.rows[tableItemIndex]?.groupExpressions
      : undefined;

  const textResourceBindings = {
    ...node?.item.textResourceBindings,
    ...expressionsForRow?.textResourceBindings,
  } as ITextResourceBindings;

  if (getEditButtonText && container) {
    const editButtonTextFromTextResources = !valid
      ? langAsString('general.edit_alt_error')
      : getEditButtonText(editIndex === tableItemIndex, langTools, textResourceBindings);

    if (!editButtonText) {
      editButtonText = editButtonTextFromTextResources;
    }
  }

  return (
    <TableContainer
      component={Grid}
      className={cn(
        classes.tableContainer,
        {
          [classes.tableRowError]: !valid,
        },
        {
          [classes.editingRow]: tableItemIndex === editIndex,
        },
        {
          [classes.aboveEditingRow]: tableItemIndex === editIndex - 1,
        },
      )}
    >
      <Table className={classes.table}>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.key}>
              <TableCell
                variant='head'
                width='40%'
              >
                <Typography
                  variant='body1'
                  className={`${classes.labelText} ${classes.textContainer}`}
                >
                  {item.label}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant='body1'
                  className={classes.textContainer}
                >
                  {item.value}
                </Typography>
              </TableCell>
              <TableCell
                className={classes.editButtonCell}
                align='right'
              >
                {index == 0 && (
                  <div className={classes.tableButtonWrapper}>
                    <Button
                      data-testid='edit-button'
                      variant={ButtonVariant.Quiet}
                      color={ButtonColor.Secondary}
                      icon={valid ? <EditIcon aria-hidden='true' /> : <WarningIcon aria-hidden='true' />}
                      iconPlacement={!mobileViewSmall ? 'right' : 'left'}
                      onClick={onEditClick}
                      aria-label={`${editButtonText}-${item.value}`}
                    >
                      {!mobileViewSmall && editButtonText}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
