import { Delete as DeleteIcon, Edit as EditIcon, Warning as WarningIcon } from '@navikt/ds-icons';
import {
  Grid,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  useMediaQuery,
} from '@material-ui/core';
import React from 'react';
import theme from 'src/theme/altinnStudioTheme';
import cn from 'classnames';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import type { ILanguage } from 'src/types/shared';
import { DeleteWarningPopover } from './DeleteWarningPopover';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';

export interface IMobileTableItem {
  key: React.Key;
  label: React.ReactNode;
  value: string;
}

export interface IAltinnMobileTableItemProps {
  items: IMobileTableItem[];
  tableItemIndex: number;
  valid?: boolean;
  editIndex: number;
  onEditClick: () => void;
  editButtonText?: string;
  deleteFunctionality?: {
    onDeleteClick: () => void;
    deleteButtonText: string;
    popoverOpen: boolean;
    popoverPanelIndex: number;
    setPopoverOpen: (open: boolean) => void;
    onOpenChange: (index: number) => void;
    onPopoverDeleteClick: (index: number) => () => void;
    language: ILanguage;
  };
}

const useStyles = makeStyles({
  tableContainer: {
    borderBottom: `1px solid ${theme.altinnPalette.primary.blueMedium}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  table: {
    tableLayout: 'fixed',
    marginTop: '1.2rem',
    marginBottom: '1.2rem',
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
    color: theme.altinnPalette.primary.grey,
  },
  editButtonCell: {
    width: '185px',
    padding: '4px !important',
    '@media (max-width: 768px)': {
      width: '50px',
    },
  },
  deleteButtonCell: {
    width: '120px',
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
    backgroundColor: theme.palette.secondary.transparentBlue,
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    marginTop: '-1px',
    borderBottom: 0,
    boxSizing: 'border-box',
    '& tbody': {
      backgroundColor: theme.palette.secondary.transparentBlue,
    },
  },
  aboveEditingRow: {
    borderBottom: 0,
  },
  popoverCurrentCell: {
    zIndex: 1,
    position: 'relative',
  },
});

export default function AltinnMobileTableItem({
  items,
  tableItemIndex,
  valid = true,
  editIndex,
  onEditClick,
  editButtonText,
  deleteFunctionality,
}: IAltinnMobileTableItemProps) {
  const classes = useStyles();
  const mobileViewSmall = useMediaQuery('(max-width:768px)');

  const {
    onDeleteClick,
    deleteButtonText,
    popoverOpen,
    popoverPanelIndex,
    setPopoverOpen,
    onPopoverDeleteClick,
    onOpenChange,
    language,
  } = deleteFunctionality || {};

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
          {items.map((item, index) => {
            return (
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
                        icon={valid ? <EditIcon /> : <WarningIcon />}
                        iconPlacement={!mobileViewSmall ? 'right' : 'left'}
                        onClick={onEditClick}
                        aria-label={`${editButtonText}-${item.value}`}
                      >
                        {!mobileViewSmall && editButtonText}
                      </Button>
                    </div>
                  )}
                </TableCell>
                {setPopoverOpen &&
                  onOpenChange &&
                  language &&
                  onPopoverDeleteClick &&
                  typeof popoverOpen === 'boolean' && (
                    <TableCell
                      align='right'
                      className={cn([classes.deleteButtonCell], {
                        [classes.popoverCurrentCell]: tableItemIndex == popoverPanelIndex,
                      })}
                    >
                      {index == 0 && (
                        <div className={classes.tableButtonWrapper}>
                          <DeleteWarningPopover
                            trigger={
                              <Button
                                data-testid='delete-button'
                                variant={ButtonVariant.Quiet}
                                color={ButtonColor.Danger}
                                icon={<DeleteIcon />}
                                iconPlacement={!mobileViewSmall ? 'right' : 'left'}
                                onClick={onDeleteClick}
                                aria-label={`${deleteButtonText}-${item.value}`}
                              >
                                {!mobileViewSmall && deleteButtonText}
                              </Button>
                            }
                            language={language}
                            deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                            messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                            open={popoverPanelIndex == tableItemIndex && popoverOpen}
                            setPopoverOpen={setPopoverOpen}
                            onCancelClick={() => onOpenChange(tableItemIndex)}
                            onPopoverDeleteClick={onPopoverDeleteClick(tableItemIndex)}
                          />
                        </div>
                      )}
                    </TableCell>
                  )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
