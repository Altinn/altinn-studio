import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GridRowRenderer } from 'src/layout/Grid/GridComponent';
import { useBaseIdsFromGridRows } from 'src/layout/Grid/tools';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupsEditContainer';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/Pagination/RepeatingGroupPagination';
import {
  useRepeatingGroup,
  useRepeatingGroupComponentId,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { RepeatingGroupTableRow } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableRow';
import { RepeatingGroupTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import utilClasses from 'src/styles/utils.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { GridCell, ITableColumnFormatting } from 'src/layout/common.generated';

export function RepeatingGroupTable(): React.JSX.Element | null {
  const mobileView = useIsMobileOrTablet();
  const { baseComponentId, isEditing } = useRepeatingGroup();
  const { rowsToDisplay } = useRepeatingGroupPagination();
  const rows = RepGroupHooks.useAllRowsWithButtons(baseComponentId);
  const { textResourceBindings, labelSettings, id, edit, minCount, stickyHeader, tableColumns, dataModelBindings } =
    useItemWhenType(baseComponentId, 'RepeatingGroup');
  const required = !!minCount && minCount > 0;

  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);
  const tableIds = useTableComponentIds(baseComponentId);
  const numRows = rowsToDisplay.length;
  const firstRowId = numRows >= 1 ? rowsToDisplay[0].uuid : undefined;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && firstRowId !== undefined && isEditing(firstRowId));

  const showDeleteButtonColumns = new Set<boolean>();
  const showEditButtonColumns = new Set<boolean>();
  for (const row of rows) {
    if (row && rowsToDisplay.some((r) => r.uuid === row.uuid)) {
      showDeleteButtonColumns.add(row.deleteButton);
      showEditButtonColumns.add(row.editButton);
    }
  }
  const displayDeleteColumn = showDeleteButtonColumns.has(true) || !showDeleteButtonColumns.has(false);
  let displayEditColumn = showEditButtonColumns.has(true) || !showEditButtonColumns.has(false);
  if (edit?.mode === 'onlyTable') {
    displayEditColumn = false;
  }

  const parent = useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
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
              <DataModelLocationProvider
                groupBinding={dataModelBindings.group}
                rowIndex={0} // Force the header row to show texts as if it is in the first row
              >
                {tableIds?.map((id) => (
                  <TitleCell
                    key={id}
                    baseComponentId={id}
                    columnSettings={columnSettings}
                  />
                ))}
              </DataModelLocationProvider>
              {displayEditColumn && (
                <Table.HeaderCell style={{ padding: 0, paddingRight: '10px' }}>
                  <span className={utilClasses.visuallyHidden}>
                    <Lang id='general.edit' />
                  </span>
                </Table.HeaderCell>
              )}
              {displayDeleteColumn && (
                <Table.HeaderCell style={{ padding: 0 }}>
                  <span className={utilClasses.visuallyHidden}>
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
  extraCells: GridCell[];
  columnSettings: ITableColumnFormatting;
}

function ExtraRows({ where, extraCells, columnSettings }: ExtraRowsProps) {
  const mobileView = useIsMobileOrTablet();
  const baseComponentId = useRepeatingGroupComponentId();
  const { visibleRows } = useRepeatingGroupRowState();
  const isEmpty = visibleRows.length === 0;
  const { rowsBefore, rowsAfter } = useExternalItem(baseComponentId, 'RepeatingGroup');
  const parent = useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';

  const rows = where === 'Before' ? rowsBefore : rowsAfter;
  const mobileBaseIds = useBaseIdsFromGridRows(rows, mobileView);
  if (isEmpty || !rows) {
    return null;
  }

  if (mobileView) {
    if (!mobileBaseIds || mobileBaseIds.length === 0) {
      return null;
    }

    return (
      <Table.Body>
        <Table.Row>
          <Table.Cell className={classes.mobileTableCell}>
            {mobileBaseIds.map((childId) => (
              <GenericComponent
                key={childId}
                baseComponentId={childId}
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
        />
      ))}
    </>
  );
}

function TitleCell({
  baseComponentId,
  columnSettings,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);

  return (
    <Table.HeaderCell
      className={classes.tableCellFormatting}
      style={style}
    >
      <RepeatingGroupTableTitle
        baseComponentId={baseComponentId}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}
