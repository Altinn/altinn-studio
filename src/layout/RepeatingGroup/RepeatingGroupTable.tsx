import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/Caption';
import { Lang } from 'src/features/language/Lang';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GridRowRenderer } from 'src/layout/Grid/GridComponent';
import { nodesFromGridRows } from 'src/layout/Grid/tools';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/RepeatingGroupPagination';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/layout/RepeatingGroup/RepeatingGroupTableRow';
import { RepeatingGroupTableTitle } from 'src/layout/RepeatingGroup/RepeatingGroupTableTitle';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { ChildLookupRestriction } from 'src/utils/layout/HierarchyGenerator';

export function RepeatingGroupTable(): React.JSX.Element | null {
  const mobileView = useIsMobileOrTablet();
  const { node, isEditing, rowsToDisplay } = useRepeatingGroup();
  const { textResourceBindings, labelSettings, id, edit, minCount, stickyHeader } = node.item;
  const required = !!minCount && minCount > 0;

  const columnSettings = node.item.tableColumns
    ? structuredClone(node.item.tableColumns)
    : ({} as ITableColumnFormatting);

  const getTableNodes = (restriction: ChildLookupRestriction) => {
    const tableHeaders = node.item?.tableHeaders;
    const nodes = node.children(undefined, restriction).filter((child) => {
      if (tableHeaders) {
        const { id, baseComponentId } = child.item;
        return !!(tableHeaders.includes(id) || (baseComponentId && tableHeaders.includes(baseComponentId)));
      }
      return child.isCategory(CompCategory.Form);
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

  const tableNodes = getTableNodes({ onlyInRowIndex: 0 });
  const numRows = rowsToDisplay.length;
  const firstRowId = numRows >= 1 ? rowsToDisplay[0].uuid : undefined;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && firstRowId !== undefined && isEditing(firstRowId));

  const showDeleteButtonColumns = new Set<boolean>();
  const showEditButtonColumns = new Set<boolean>();
  for (const row of node.item.rows) {
    if (rowsToDisplay.some((r) => r.uuid === row.uuid)) {
      showDeleteButtonColumns.add(row.groupExpressions.edit?.deleteButton !== false);
      showEditButtonColumns.add(row.groupExpressions.edit?.editButton !== false);
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

  const isNested = typeof node.item?.baseComponentId === 'string';

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
                <Table.HeaderCell
                  key={n.item.id}
                  className={classes.tableCellFormatting}
                  style={getColumnStylesRepeatingGroups(n, columnSettings)}
                >
                  <RepeatingGroupTableTitle
                    node={n}
                    columnSettings={columnSettings}
                  />
                </Table.HeaderCell>
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
              <React.Fragment key={row.uuid}>
                <RepeatingGroupTableRow
                  className={cn({
                    [classes.editingRow]: isEditingRow,
                    [classes.editRowOnTopOfStickyHeader]: isEditingRow && stickyHeader,
                  })}
                  uuid={row.uuid}
                  getTableNodes={getTableNodes}
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
  extraCells: null[];
  columnSettings: ITableColumnFormatting;
}

function ExtraRows({ where, extraCells, columnSettings }: ExtraRowsProps) {
  const mobileView = useIsMobileOrTablet();
  const { visibleRows, node } = useRepeatingGroup();
  const isEmpty = visibleRows.length === 0;
  const isNested = typeof node.item.baseComponentId === 'string';

  const rows = where === 'Before' ? node.item.rowsBefore : node.item.rowsAfter;
  if (isEmpty || !rows) {
    return null;
  }

  if (mobileView) {
    const nodes = nodesFromGridRows(rows).filter((child) => !child.isHidden());
    if (!nodes) {
      return null;
    }

    return (
      <Table.Body>
        <Table.Row>
          <Table.Cell className={classes.mobileTableCell}>
            {nodes.map((child) => (
              <GenericComponent
                key={child.item.id}
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
