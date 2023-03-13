import React, { useState } from 'react';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@altinn/altinn-design-system';
import { useMediaQuery } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import classes from 'src/features/form/containers/RepeatingGroup.module.css';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/features/form/containers/RepeatingGroupTableRow';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { ComponentType } from 'src/layout';
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
    </div>
  );
}
