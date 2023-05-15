import React, { useState } from 'react';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@digdir/design-system-react';
import { useMediaQuery } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { GridRowRenderer } from 'src/layout/Grid/GridComponent';
import classes from 'src/layout/Group/RepeatingGroup.module.css';
import { RepeatingGroupsEditContainer } from 'src/layout/Group/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/layout/Group/RepeatingGroupTableRow';
import { ComponentType } from 'src/layout/LayoutComponent';
import { getColumnStylesRepeatingGroups, getTextResource } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { GridComponent, GridRow } from 'src/layout/Grid/types';
import type { ITableColumnFormatting } from 'src/layout/layout';
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
  rowsBefore?: GridRow<GridComponent>[];
  rowsAfter?: GridRow<GridComponent>[];
}

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
  rowsBefore,
  rowsAfter,
}: IRepeatingGroupTableProps): JSX.Element | null {
  const mobileView = useMediaQuery('(max-width:992px)');
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  const node = useResolvedNode(id);
  const container = node?.isRepGroup() ? node.item : undefined;
  const edit = container?.edit;
  const columnSettings = container?.tableColumns
    ? structuredClone(container.tableColumns)
    : ({} as ITableColumnFormatting);

  const getTableNodes = (rowIndex: number) => {
    const tableHeaders = container?.tableHeaders;
    const nodes = node?.children(undefined, rowIndex).filter((child) => {
      if (tableHeaders) {
        const { id, baseComponentId } = child.item;
        return !!(tableHeaders.includes(id) || (baseComponentId && tableHeaders.includes(baseComponentId)));
      }
      return child.isComponentType(ComponentType.Form);
    });

    // Sort using the order from tableHeaders
    if (tableHeaders) {
      nodes?.sort((a, b) => {
        const aIndex = tableHeaders.indexOf(a.item.baseComponentId || a.item.id);
        const bIndex = tableHeaders.indexOf(b.item.baseComponentId || b.item.id);
        return aIndex - bIndex;
      });
    }

    return nodes;
  };

  const tableNodes = getTableNodes(0);

  // Values adjusted for filter
  const numRows = filteredIndexes ? filteredIndexes.length : repeatingGroupIndex + 1;
  const editRowIndex = filteredIndexes ? filteredIndexes.indexOf(editIndex) : editIndex;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && editRowIndex == 0);
  const [popoverPanelIndex, setPopoverPanelIndex] = useState(-1);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const showDeleteButtonColumns = new Set<boolean>();
  const showEditButtonColumns = new Set<boolean>();
  if (node?.item.type === 'Group' && 'rows' in node.item) {
    for (const row of node.item.rows) {
      showDeleteButtonColumns.add(row?.groupExpressions?.edit?.deleteButton !== false);
      showEditButtonColumns.add(row?.groupExpressions?.edit?.editButton !== false);
    }
  }
  let displayDeleteColumn = showDeleteButtonColumns.has(true) || !showDeleteButtonColumns.has(false);
  let displayEditColumn = showEditButtonColumns.has(true) || !showEditButtonColumns.has(false);
  if (edit?.editButton === false) {
    displayEditColumn = false;
  }
  if (edit?.deleteButton === false) {
    displayDeleteColumn = false;
  }
  if (edit?.mode === 'onlyTable') {
    displayEditColumn = false;
  }

  const isNested = typeof container?.baseComponentId === 'string';

  const onOpenChange = (index: number) => {
    if (index == popoverPanelIndex && popoverOpen) {
      setPopoverPanelIndex(-1);
    } else {
      setPopoverPanelIndex(index);
    }
  };

  const handlePopoverDeleteClick = (index: number) => () => {
    onClickRemove(index);
    onOpenChange(index);
    setPopoverOpen(false);
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

  const renderRepeatingGroupsEditContainer = () =>
    editIndex >= 0 &&
    edit?.mode !== 'onlyTable' && (
      <RepeatingGroupsEditContainer
        editIndex={editIndex}
        setEditIndex={setEditIndex}
        repeatingGroupIndex={repeatingGroupIndex}
        id={id}
        multiPageIndex={multiPageIndex}
        setMultiPageIndex={setMultiPageIndex}
        filteredIndexes={filteredIndexes}
      />
    );

  if (!tableNodes || !node || !container || !language) {
    return null;
  }

  const extraCells = [...(displayEditColumn ? [null] : []), ...(displayDeleteColumn ? [null] : [])];

  return (
    <div
      data-testid={`group-${id}`}
      id={`group-${id}`}
      className={cn({
        [classes.groupContainer]: !isNested,
        [classes.nestedGroupContainer]: isNested,
        [classes.tableEmpty]: isEmpty,
      })}
    >
      <Table
        id={`group-${id}-table`}
        className={cn({ [classes.editingBorder]: isNested }, classes.repeatingGroupTable)}
      >
        {!isEmpty &&
          rowsBefore?.map((row, index) => (
            <GridRowRenderer
              key={`gridBefore-${index}`}
              row={{ ...row, cells: [...row.cells, ...extraCells] }}
              isNested={isNested}
              mutableColumnSettings={columnSettings}
            />
          ))}
        {showTableHeader && !mobileView && (
          <TableHeader id={`group-${id}-table-header`}>
            <TableRow className={classes.repeatingGroupRow}>
              {tableNodes?.map((n) => (
                <TableCell
                  key={n.item.id}
                  className={classes.tableCellFormatting}
                  style={getColumnStylesRepeatingGroups(n.item, columnSettings)}
                >
                  <span
                    className={classes.contentFormatting}
                    style={getColumnStylesRepeatingGroups(n.item, columnSettings)}
                  >
                    {getTextResource(getTableTitle(n.item.textResourceBindings || {}), textResources)}
                  </span>
                </TableCell>
              ))}
              {displayEditColumn && (
                <TableCell style={{ padding: 0, paddingRight: '10px' }}>
                  <span className={classes.visuallyHidden}>{getLanguageFromKey('general.edit', language)}</span>
                </TableCell>
              )}
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

              const isTableRowHidden =
                node.item.type === 'Group' && 'rows' in node.item && node.item.rows[index]?.groupExpressions?.hiddenRow;

              if (isTableRowHidden) {
                return null;
              }

              const isEditingRow = index === editIndex && edit?.mode !== 'onlyTable';

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
                    displayDeleteColumn={displayDeleteColumn}
                    displayEditColumn={displayEditColumn}
                  />
                  {isEditingRow && (
                    <TableRow
                      key={`edit-container-${index}`}
                      className={classes.editContainerRow}
                    >
                      <TableCell
                        style={{ padding: 0, borderTop: 0 }}
                        colSpan={
                          mobileView
                            ? 2
                            : tableNodes.length + 3 + (displayEditColumn ? 1 : 0) + (displayDeleteColumn ? 1 : 0)
                        }
                      >
                        {renderRepeatingGroupsEditContainer()}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
        </TableBody>
        {!isEmpty &&
          rowsAfter?.map((row, index) => (
            <GridRowRenderer
              key={`gridAfter-${index}`}
              row={{ ...row, cells: [...row.cells, ...extraCells] }}
              isNested={isNested}
              mutableColumnSettings={columnSettings}
            />
          ))}
      </Table>
    </div>
  );
}
