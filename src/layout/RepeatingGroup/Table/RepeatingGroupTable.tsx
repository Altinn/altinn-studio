import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useIndexedComponentIds } from 'src/features/form/layout/utils/makeIndexedId';
import { Lang } from 'src/features/language/Lang';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { GridRowRenderer } from 'src/layout/Grid/GridComponent';
import { useNodeIdsFromGridRows } from 'src/layout/Grid/tools';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupsEditContainer';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/Pagination/RepeatingGroupPagination';
import {
  useRepeatingGroup,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { RepeatingGroupTableRow } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableRow';
import { RepeatingGroupTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider, useDataModelLocationForRow } from 'src/utils/layout/DataModelLocation';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { GridCellInternal } from 'src/layout/Grid/types';

export function RepeatingGroupTable(): React.JSX.Element | null {
  const mobileView = useIsMobileOrTablet();
  const { node, isEditing } = useRepeatingGroup();
  const { rowsToDisplay } = useRepeatingGroupPagination();
  const {
    textResourceBindings,
    labelSettings,
    id,
    edit,
    minCount,
    stickyHeader,
    tableColumns,
    rows,
    baseComponentId,
    dataModelBindings,
  } = useNodeItem(node);
  const required = !!minCount && minCount > 0;

  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);
  const location = useDataModelLocationForRow(dataModelBindings.group, 0);
  const tableIds = useIndexedComponentIds(useTableComponentIds(node), location);
  const numRows = rowsToDisplay.length;
  const firstRowId = numRows >= 1 ? rowsToDisplay[0].uuid : undefined;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && firstRowId !== undefined && isEditing(firstRowId));

  const showDeleteButtonColumns = new Set<boolean>();
  const showEditButtonColumns = new Set<boolean>();
  for (const row of rows) {
    if (row && rowsToDisplay.some((r) => r.uuid === row.uuid)) {
      showDeleteButtonColumns.add(row.groupExpressions?.edit?.deleteButton !== false);
      showEditButtonColumns.add(row.groupExpressions?.edit?.editButton !== false);
    }
  }
  const displayDeleteColumn = showDeleteButtonColumns.has(true) || !showDeleteButtonColumns.has(false);
  let displayEditColumn = showEditButtonColumns.has(true) || !showEditButtonColumns.has(false);
  if (edit?.mode === 'onlyTable') {
    displayEditColumn = false;
  }

  const isNested = typeof baseComponentId === 'string';
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
        stickyHeader={stickyHeader}
        className={cn(
          {
            [classes.editingBorder]: isNested,
            [classes.nestedTable]: isNested,
            [classes.nestedNonSticky]: isNested && !stickyHeader,
          },
          classes.repeatingGroupTable,
        )}
        // If the list is empty, the border of the table will be visible as a line above
        // the "Legg til ny" button.
        border={isNested && rowsToDisplay.length > 0}
      >
        {textResourceBindings?.title && (
          <Caption
            id={`group-${id}-caption`}
            className={cn({ [classes.fullWidthCaption]: !isEmpty && !isNested })}
            title={<Lang id={textResourceBindings.title} />}
            description={textResourceBindings.description && <Lang id={textResourceBindings.description} />}
            labelSettings={labelSettings}
            required={required}
          />
        )}
        <ExtraRows
          where='Before'
          extraCells={extraCells}
          columnSettings={columnSettings}
        />
        {showTableHeader && !mobileView && (
          <Table.Head id={`group-${id}-table-header`}>
            <Table.Row>
              {tableIds?.map((id) => (
                <TitleCell
                  key={id}
                  nodeId={id}
                  columnSettings={columnSettings}
                />
              ))}
              {displayEditColumn && (
                <Table.HeaderCell style={{ padding: 0, paddingRight: '10px' }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id='general.edit' />
                  </span>
                </Table.HeaderCell>
              )}
              {displayDeleteColumn && (
                <Table.HeaderCell style={{ padding: 0 }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id='general.delete' />
                  </span>
                </Table.HeaderCell>
              )}
            </Table.Row>
          </Table.Head>
        )}
        <Table.Body id={`group-${id}-table-body`}>
          {rowsToDisplay.map((row) => {
            const isEditingRow = isEditing(row.uuid) && edit?.mode !== 'onlyTable';
            return (
              <DataModelLocationProvider
                key={`${row.uuid}-${row.index}`}
                groupBinding={dataModelBindings.group}
                rowIndex={row.index}
              >
                <RepeatingGroupTableRow
                  className={cn({
                    [classes.editingRow]: isEditingRow,
                    [classes.editRowOnTopOfStickyHeader]: isEditingRow && stickyHeader,
                  })}
                  uuid={row.uuid}
                  index={row.index}
                  mobileView={mobileView}
                  displayDeleteColumn={displayDeleteColumn}
                  displayEditColumn={displayEditColumn}
                />
                {isEditingRow && (
                  <Table.Row
                    key={`edit-container-${row.uuid}`}
                    className={cn(
                      { [classes.editContainerOnTopOfStickyHeader]: isEditingRow && stickyHeader },
                      classes.editContainerRow,
                    )}
                  >
                    <Table.Cell
                      style={{ padding: 0, borderTop: 0 }}
                      colSpan={
                        mobileView
                          ? 2
                          : tableIds.length + 3 + (displayEditColumn ? 1 : 0) + (displayDeleteColumn ? 1 : 0)
                      }
                    >
                      {edit?.mode !== 'onlyTable' && <RepeatingGroupsEditContainer editId={row.uuid} />}
                    </Table.Cell>
                  </Table.Row>
                )}
              </DataModelLocationProvider>
            );
          })}
        </Table.Body>
        <RepeatingGroupPagination />
        <ExtraRows
          where='After'
          extraCells={extraCells}
          columnSettings={columnSettings}
        />
      </Table>
    </div>
  );
}

interface ExtraRowsProps {
  where: 'Before' | 'After';
  extraCells: GridCellInternal[];
  columnSettings: ITableColumnFormatting;
}

function ExtraRows({ where, extraCells, columnSettings }: ExtraRowsProps) {
  const mobileView = useIsMobileOrTablet();
  const { node } = useRepeatingGroup();
  const { visibleRows } = useRepeatingGroupRowState();
  const isEmpty = visibleRows.length === 0;
  const item = useNodeItem(node);
  const isNested = node.parent instanceof BaseLayoutNode;

  const rows = where === 'Before' ? item.rowsBeforeInternal : item.rowsAfterInternal;
  const mobileNodeIds = useNodeIdsFromGridRows(rows, mobileView);
  if (isEmpty || !rows) {
    return null;
  }

  if (mobileView) {
    if (!mobileNodeIds || mobileNodeIds.length === 0) {
      return null;
    }

    return (
      <Table.Body>
        <Table.Row>
          <Table.Cell className={classes.mobileTableCell}>
            {mobileNodeIds.map((childId) => (
              <GenericComponentById
                key={childId}
                id={childId}
              />
            ))}
          </Table.Cell>
          {/* One extra cell to make place for edit/delete buttons */}
          <Table.Cell className={classes.mobileTableCell} />
        </Table.Row>
      </Table.Body>
    );
  }

  return (
    <>
      {rows.map((row, index) => (
        <GridRowRenderer
          key={`grid${where}-${index}`}
          row={{ ...row, cells: [...row.cells, ...extraCells] }}
          isNested={isNested}
          mutableColumnSettings={columnSettings}
          node={node}
        />
      ))}
    </>
  );
}

function TitleCell({ nodeId, columnSettings }: { nodeId: string; columnSettings: ITableColumnFormatting }) {
  const node = useNode(nodeId);
  const style = useColumnStylesRepeatingGroups(node, columnSettings);

  return (
    <Table.HeaderCell
      className={classes.tableCellFormatting}
      style={style}
    >
      <RepeatingGroupTableTitle
        node={node}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}
