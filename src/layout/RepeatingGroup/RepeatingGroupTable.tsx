import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/Caption';
import { Lang } from 'src/features/language/Lang';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GridRowRenderer } from 'src/layout/Grid/GridComponent';
import { useNodesFromGridRows } from 'src/layout/Grid/tools';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import {
  useRepeatingGroup,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/RepeatingGroupPagination';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/layout/RepeatingGroup/RepeatingGroupTableRow';
import { RepeatingGroupTableTitle } from 'src/layout/RepeatingGroup/RepeatingGroupTableTitle';
import { useTableNodes } from 'src/layout/RepeatingGroup/useTableNodes';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { GridCellInternal } from 'src/layout/Grid/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function RepeatingGroupTable(): React.JSX.Element | null {
  const mobileView = useIsMobileOrTablet();
  const { node, isEditing } = useRepeatingGroup();
  const { rowsToDisplay } = useRepeatingGroupPagination();
  const { textResourceBindings, labelSettings, id, edit, minCount, stickyHeader, tableColumns, rows, baseComponentId } =
    useNodeItem(node);
  const required = !!minCount && minCount > 0;

  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);

  const tableNodes = useTableNodes(node, 0);

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

  if (!tableNodes) {
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
            className={cn({ [classes.tableNotEmptyCaption]: !isEmpty })}
            title={<Lang id={textResourceBindings.title} />}
            description={textResourceBindings.description && <Lang id={textResourceBindings.description} />}
            labelSettings={labelSettings}
            required={required}
          />
        )}
        <ExtraRows
          where={'Before'}
          extraCells={extraCells}
          columnSettings={columnSettings}
        />
        {showTableHeader && !mobileView && (
          <Table.Head id={`group-${id}-table-header`}>
            <Table.Row>
              {tableNodes?.map((n) => (
                <TitleCell
                  key={n.id}
                  node={n}
                  columnSettings={columnSettings}
                />
              ))}
              {displayEditColumn && (
                <Table.HeaderCell style={{ padding: 0, paddingRight: '10px' }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id={'general.edit'} />
                  </span>
                </Table.HeaderCell>
              )}
              {displayDeleteColumn && (
                <Table.HeaderCell style={{ padding: 0 }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id={'general.delete'} />
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
              <React.Fragment key={`${row.uuid}-${row.index}`}>
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
                          : tableNodes.length + 3 + (displayEditColumn ? 1 : 0) + (displayDeleteColumn ? 1 : 0)
                      }
                    >
                      {edit?.mode !== 'onlyTable' && <RepeatingGroupsEditContainer editId={row.uuid} />}
                    </Table.Cell>
                  </Table.Row>
                )}
              </React.Fragment>
            );
          })}
        </Table.Body>
        <RepeatingGroupPagination />
        <ExtraRows
          where={'After'}
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
  const mobileNodes = useNodesFromGridRows(rows, mobileView);
  if (isEmpty || !rows) {
    return null;
  }

  if (mobileView) {
    if (!mobileNodes || mobileNodes.length === 0) {
      return null;
    }

    return (
      <Table.Body>
        <Table.Row>
          <Table.Cell className={classes.mobileTableCell}>
            {mobileNodes.map((child) => (
              <GenericComponent
                key={child.id}
                node={child}
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

function TitleCell({ node, columnSettings }: { node: LayoutNode; columnSettings: ITableColumnFormatting }) {
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
