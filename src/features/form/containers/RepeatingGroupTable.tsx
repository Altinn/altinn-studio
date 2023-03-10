import React, { useState } from 'react';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@altinn/altinn-design-system';
import { createTheme, Grid, makeStyles, useMediaQuery } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import {
  fullWidthWrapper,
  xPaddingLarge,
  xPaddingMedium,
  xPaddingSmall,
} from 'src/features/form/components/FullWidthWrapper';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/features/form/containers/RepeatingGroupTableRow';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { ComponentType } from 'src/layout';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getTextAlignment, getTextResource } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ITextResourceBindings } from 'src/types';

export interface IRepeatingGroupTableProps {
  id: string;
  repeatingGroupIndex: number;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  onClickRemove: (groupIndex: number) => void;
  setMultiPageIndex?: (index: number) => void;
  multiPageIndex?: number;
  deleting: boolean;
  filteredIndexes?: number[] | null;
}

const theme = createTheme(AltinnAppTheme);

const cellMargin = 15;
const useStyles = makeStyles({
  fullWidthWrapper,
  groupContainer: {
    overflowX: 'auto',
    marginBottom: 15,

    // Line up content with page
    '& > table > tbody > tr > td:first-child, & > table > thead > tr > th:first-child': {
      paddingLeft: xPaddingSmall - cellMargin,
      '@media (min-width: 768px)': {
        paddingLeft: xPaddingMedium - cellMargin,
      },
      '@media (min-width: 992px)': {
        paddingLeft: xPaddingLarge - cellMargin,
      },
    },
    '& > table > tbody > tr > td:last-child, & > table > thead > tr > th:last-child': {
      paddingRight: xPaddingSmall - cellMargin,
      '@media (min-width: 768px)': {
        paddingRight: xPaddingMedium - cellMargin,
      },
      '@media (min-width: 992px)': {
        paddingRight: xPaddingLarge - cellMargin,
      },
    },
  },
  nestedGroupContainer: {
    overflowX: 'auto',
    margin: '0 0 15px 0',
    width: '100%',
  },
  tableEmpty: {
    margin: 0,
  },
  editingBorder: {
    width: 'calc(100% - 2px)',
    margin: '0 auto',
    '& $editContainerRow': {
      borderRight: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      borderLeft: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    },
    '& $editingRow': {
      borderRight: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      borderLeft: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    },
  },
  editContainerRow: {
    borderTop: `1px solid ${theme.altinnPalette.primary.blueLight}`,
    borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    '& > td > div': {
      margin: 0,
    },
  },
  editingRow: {
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    backgroundColor: '#f1fbff',
    '& > td': {
      borderBottom: 0,
    },
  },
  visuallyHidden: {
    border: 0,
    padding: 0,
    margin: 0,
    position: 'absolute',
    height: '1px',
    width: '1px',
    overflow: 'hidden',
    clip: 'rect(1px 1px 1px 1px)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  contentFormatting: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    lineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  },
});

function getTableTitle(textResourceBindings: ITextResourceBindings) {
  if (textResourceBindings.tableTitle) {
    return textResourceBindings.tableTitle;
  }
  if (textResourceBindings.title) {
    return textResourceBindings.title;
  }
  return '';
}

export function RepeatingGroupTable({
  id,
  repeatingGroupIndex,
  editIndex,
  setEditIndex,
  onClickRemove,
  setMultiPageIndex,
  multiPageIndex,
  deleting,
  filteredIndexes,
}: IRepeatingGroupTableProps): JSX.Element | null {
  const classes = useStyles();
  const mobileView = useMediaQuery('(max-width:992px)');
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  const node = useResolvedNode(id);
  const container = node?.item.type === 'Group' && 'rows' in node.item ? node.item : undefined;
  const edit = container?.edit;

  const getTableNodes = (rowIndex: number) =>
    node?.children(undefined, rowIndex).filter((child) => {
      if (container?.tableHeaders) {
        const { id, baseComponentId } = child.item;
        return !!(
          container.tableHeaders.includes(id) ||
          (baseComponentId && container.tableHeaders.includes(baseComponentId))
        );
      }
      return child.getComponent().getComponentType() === ComponentType.Form;
    });

  const tableNodes = getTableNodes(0);

  // Values adjusted for filter
  const numRows = filteredIndexes ? filteredIndexes.length : repeatingGroupIndex + 1;
  const editRowIndex = filteredIndexes ? filteredIndexes.indexOf(editIndex) : editIndex;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && editRowIndex == 0);
  const [popoverPanelIndex, setPopoverPanelIndex] = useState(-1);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const showDeleteButtonColumns = new Set<boolean>();
  if (node?.item.type === 'Group' && 'rows' in node.item) {
    for (const row of node.item.rows) {
      showDeleteButtonColumns.add(row?.groupExpressions?.edit?.deleteButton !== false);
    }
  }
  const displayDeleteColumn = showDeleteButtonColumns.has(true) || !showDeleteButtonColumns.has(false);

  const isNested = typeof container?.baseComponentId === 'string';

  const onOpenChange = (index: number) => {
    if (index == popoverPanelIndex && popoverOpen) {
      setPopoverPanelIndex(-1);
    } else {
      setPopoverPanelIndex(index);
    }
  };

  const handlePopoverDeleteClick = (index: number) => {
    return () => {
      onClickRemove(index);
      onOpenChange(index);
      setPopoverOpen(false);
    };
  };

  const handleDeleteClick = (index: number) => {
    if (edit?.alertOnDelete) {
      onOpenChange(index);
    } else {
      onClickRemove(index);
    }
  };

  const handleEditClick = (groupIndex: number) => {
    if (groupIndex === editIndex) {
      setEditIndex(-1);
    } else {
      setEditIndex(groupIndex);
    }
  };

  const renderRepeatingGroupsEditContainer = () => {
    return (
      editIndex >= 0 && (
        <RepeatingGroupsEditContainer
          editIndex={editIndex}
          setEditIndex={setEditIndex}
          repeatingGroupIndex={repeatingGroupIndex}
          id={id}
          multiPageIndex={multiPageIndex}
          setMultiPageIndex={setMultiPageIndex}
          filteredIndexes={filteredIndexes}
        />
      )
    );
  };

  if (!tableNodes || !tableNodes.length || !node || !container || !language) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      data-testid={`group-${id}`}
      id={`group-${id}`}
      className={cn({
        [classes.fullWidthWrapper]: !isNested,
        [classes.groupContainer]: !isNested,
        [classes.nestedGroupContainer]: isNested,
        [classes.tableEmpty]: isEmpty,
      })}
    >
      <Table
        id={`group-${id}-table`}
        className={cn({ [classes.editingBorder]: isNested })}
      >
        {showTableHeader && !mobileView && (
          <TableHeader id={`group-${id}-table-header`}>
            <TableRow>
              {tableNodes?.map((n) => (
                <TableCell
                  style={{ textAlign: getTextAlignment(n.item) }}
                  key={n.item.id}
                >
                  <span className={classes.contentFormatting}>
                    {getTextResource(getTableTitle(n.item.textResourceBindings || {}), textResources)}
                  </span>
                </TableCell>
              ))}
              <TableCell style={{ padding: 0, paddingRight: '10px' }}>
                <span className={classes.visuallyHidden}>{getLanguageFromKey('general.edit', language)}</span>
              </TableCell>
              {displayDeleteColumn && (
                <TableCell style={{ padding: 0 }}>
                  <span className={classes.visuallyHidden}>{getLanguageFromKey('general.delete', language)}</span>
                </TableCell>
              )}
            </TableRow>
          </TableHeader>
        )}
        <TableBody id={`group-${id}-table-body`}>
          {repeatingGroupIndex >= 0 &&
            [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
              const children = node.children(undefined, index);
              const rowHasErrors = !!children.find((c) => c.hasValidationMessages());

              // Check if filter is applied and includes specified index.
              if (filteredIndexes && !filteredIndexes.includes(index)) {
                return null;
              }

              const isEditingRow = index === editIndex;

              return (
                <React.Fragment key={index}>
                  <RepeatingGroupTableRow
                    id={id}
                    className={cn({
                      [classes.editingRow]: isEditingRow,
                    })}
                    editIndex={editIndex}
                    setEditIndex={setEditIndex}
                    onClickRemove={onClickRemove}
                    deleting={deleting}
                    index={index}
                    rowHasErrors={rowHasErrors}
                    getTableNodes={getTableNodes}
                    onEditClick={() => handleEditClick(index)}
                    mobileView={mobileView}
                    deleteFunctionality={{
                      onDeleteClick: () => handleDeleteClick(index),
                      popoverPanelIndex,
                      popoverOpen,
                      setPopoverOpen,
                      onPopoverDeleteClick: handlePopoverDeleteClick,
                      onOpenChange,
                    }}
                  />
                  {isEditingRow && (
                    <TableRow
                      key={`edit-container-${index}`}
                      className={classes.editContainerRow}
                    >
                      <TableCell
                        style={{ padding: 0, borderTop: 0 }}
                        colSpan={mobileView ? 2 : tableNodes.length + 1 + Number(displayDeleteColumn)}
                      >
                        {renderRepeatingGroupsEditContainer()}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
        </TableBody>
      </Table>
    </Grid>
  );
}
