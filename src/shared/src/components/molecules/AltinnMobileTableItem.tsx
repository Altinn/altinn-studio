import {
  Grid,
  IconButton,
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
import theme from '../../theme/altinnStudioTheme';
import cn from 'classnames';
import { getLanguageFromKey } from '../../utils/language';
import type { ILanguage } from '../../types';
import { DeleteWarningPopover } from './DeleteWarningPopover';

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
  editIconNode: React.ReactNode;
  deleteFunctionality?: {
    onDeleteClick: () => void;
    deleteButtonText: string;
    deleteIconNode: React.ReactNode;
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
  tableEditButton: {
    color: theme.altinnPalette.primary.blueDark,
    fontWeight: 700,
    borderRadius: '5px',
    padding: '6px 12px',
    margin: '8px 2px 8px -12px',
    '@media (max-width: 768px)': {
      fontSize: '2.5rem',
      height: '3rem',
      width: '3rem',
      margin: '0',
      padding: '0',
      borderRadius: '50%',
      outlineOffset: '-2px',
    },
    '&:hover': {
      background: 'none',
      outline: `1px dotted ${theme.altinnPalette.primary.blueDark}`,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueLighter,
      outline: `2px dotted ${theme.altinnPalette.primary.blueDark}`,
    },
  },
  editButtonActivated: {
    background: theme.altinnPalette.primary.blueLighter,
    outline: `2px dotted ${theme.altinnPalette.primary.blueDark}`,
    '@media (max-width: 768px)': {
      fontSize: '2.5rem',
      height: '3rem',
      width: '3rem',
      margin: '0',
      padding: '0',
      borderRadius: '50%',
    },
    '&:hover': {
      background: 'none',
      outline: `1px dotted ${theme.altinnPalette.primary.blueDark}`,
    },
  },
  deleteButton: {
    color: theme.altinnPalette.primary.red,
    fontWeight: 700,
    padding: '8px 12px 6px 6px',
    borderRadius: '0',
    marginRight: '-12px',
    '& .ai': {
      fontSize: '2em',
      marginTop: '-3px',
    },
    '@media (max-width: 768px)': {
      height: '3rem',
      justifySelf: 'right',
      width: '3rem',
      margin: '0',
      marginRight: '2rem',
      padding: '0',
      borderRadius: '50%',
      '& .ai': {
        fontSize: '2.7rem',
        marginTop: '0',
      },
    },
    '&:hover': {
      background: theme.altinnPalette.primary.red,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      outlineColor: theme.altinnPalette.primary.red,
    },
  },
  editButtonCell: {
    width: '150px',
    padding: '0 !important',
    '@media (max-width: 768px)': {
      width: '50px',
    },
  },
  deleteButtonCell: {
    width: '100px',
    padding: '0 !important',
    '@media (max-width: 768px)': {
      width: '50px',
    },
  },
  textContainer: {
    width: '100%',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  editingRow: {
    backgroundColor: 'rgba(227, 247, 255, 0.5)',
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    marginTop: '-1px',
    borderBottom: 0,
    boxSizing: 'border-box',
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
  editIconNode,
  deleteFunctionality,
}: IAltinnMobileTableItemProps) {
  const classes = useStyles();
  const mobileViewSmall = useMediaQuery('(max-width:768px)');

  const {
    onDeleteClick,
    deleteIconNode,
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
                {index == 0 && (
                  <TableCell
                    className={classes.editButtonCell}
                    align='right'
                  >
                    <IconButton
                      className={cn(classes.tableEditButton, {
                        [classes.editButtonActivated]: editIndex === tableItemIndex,
                      })}
                      onClick={onEditClick}
                      data-testid='edit-button'
                      aria-label={`${editButtonText}-${item.value}`}
                    >
                      {editIconNode}
                      {!mobileViewSmall && editButtonText}
                    </IconButton>
                  </TableCell>
                )}
                {index == 0 &&
                  deleteIconNode &&
                  setPopoverOpen &&
                  onOpenChange &&
                  language &&
                  onPopoverDeleteClick &&
                  typeof popoverOpen === 'boolean' && (
                    <TableCell
                      align='center'
                      className={cn([classes.deleteButtonCell], {
                        [classes.popoverCurrentCell]: tableItemIndex == popoverPanelIndex,
                      })}
                    >
                      <DeleteWarningPopover
                        trigger={
                          <IconButton
                            className={classes.deleteButton}
                            onClick={onDeleteClick}
                            data-testid='delete-button'
                            aria-label={`${deleteButtonText}-${item.value}`}
                          >
                            {deleteIconNode}
                            {!mobileViewSmall && deleteButtonText}
                          </IconButton>
                        }
                        language={language}
                        deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                        messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                        open={popoverPanelIndex == tableItemIndex && popoverOpen}
                        setPopoverOpen={setPopoverOpen}
                        onCancelClick={() => onOpenChange(tableItemIndex)}
                        onPopoverDeleteClick={onPopoverDeleteClick(tableItemIndex)}
                      />
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
