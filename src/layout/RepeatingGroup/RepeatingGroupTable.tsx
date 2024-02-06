import React from 'react';

import {
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
} from '@digdir/design-system-react';
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
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTableRow } from 'src/layout/RepeatingGroup/RepeatingGroupTableRow';
import { RepeatingGroupTableTitle } from 'src/layout/RepeatingGroup/RepeatingGroupTableTitle';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { GridRowsInternal, ITableColumnFormatting } from 'src/layout/common.generated';

export function RepeatingGroupTable(): React.JSX.Element | null {
  const mobileView = useIsMobileOrTablet();
  const { node, isEditing, visibleRowIndexes } = useRepeatingGroup();
  const rowsBefore = node.item.rowsBefore;
  const rowsAfter = node.item.rowsAfter;

  const container = node.item;
  const { textResourceBindings, labelSettings, id, edit, minCount } = container;

  const required = !!minCount && minCount > 0;

  const columnSettings = container.tableColumns
    ? structuredClone(container.tableColumns)
    : ({} as ITableColumnFormatting);

  const getTableNodes = (rowIndex: number) => {
    const tableHeaders = container?.tableHeaders;
    const nodes = node.children(undefined, rowIndex).filter((child) => {
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

  const tableNodes = getTableNodes(0);
  const numRows = visibleRowIndexes.length;
  const firstRowIndex = visibleRowIndexes[0];

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && isEditing(firstRowIndex));

  const showDeleteButtonColumns = new Set<boolean>();
  const showEditButtonColumns = new Set<boolean>();
  for (const row of node.item.rows) {
    showDeleteButtonColumns.add(row?.groupExpressions?.edit?.deleteButton !== false);
    showEditButtonColumns.add(row?.groupExpressions?.edit?.editButton !== false);
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

  if (!tableNodes) {
    return null;
  }

  const extraCells = [...(displayEditColumn ? [null] : []), ...(displayDeleteColumn ? [null] : [])];

  function RenderExtraRows({ rows, where }: { rows: GridRowsInternal | undefined; where: 'Before' | 'After' }) {
    if (isEmpty || !rows) {
      return null;
    }

    if (mobileView) {
      const nodes = nodesFromGridRows(rows).filter((child) => !child.isHidden());
      if (!nodes) {
        return null;
      }

      return (
        <LegacyTableBody>
          <LegacyTableRow>
            <LegacyTableCell className={classes.mobileTableCell}>
              {nodes.map((child) => (
                <GenericComponent
                  key={child.item.id}
                  node={child}
                />
              ))}
            </LegacyTableCell>
            {/* One extra cell to make place for edit/delete buttons */}
            <LegacyTableCell className={classes.mobileTableCell} />
          </LegacyTableRow>
        </LegacyTableBody>
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
      <LegacyTable
        id={`group-${id}-table`}
        className={cn({ [classes.editingBorder]: isNested }, classes.repeatingGroupTable)}
      >
        {textResourceBindings?.title && (
          <Caption
            id={`group-${id}-caption`}
            className={cn({ [classes.tableNotEmptyCaption]: !isEmpty })}
            title={<Lang id={textResourceBindings.title} />}
            description={<Lang id={textResourceBindings.description} />}
            labelSettings={labelSettings}
            required={required}
          />
        )}

        <RenderExtraRows
          rows={rowsBefore}
          where={'Before'}
        />
        {showTableHeader && !mobileView && (
          <LegacyTableHeader id={`group-${id}-table-header`}>
            <LegacyTableRow className={classes.repeatingGroupRow}>
              {tableNodes?.map((n) => (
                <LegacyTableCell
                  key={n.item.id}
                  className={classes.tableCellFormatting}
                  style={getColumnStylesRepeatingGroups(n, columnSettings)}
                >
                  <RepeatingGroupTableTitle
                    node={n}
                    columnSettings={columnSettings}
                  />
                </LegacyTableCell>
              ))}
              {displayEditColumn && (
                <LegacyTableCell style={{ padding: 0, paddingRight: '10px' }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id={'general.edit'} />
                  </span>
                </LegacyTableCell>
              )}
              {displayDeleteColumn && (
                <LegacyTableCell style={{ padding: 0 }}>
                  <span className={classes.visuallyHidden}>
                    <Lang id={'general.delete'} />
                  </span>
                </LegacyTableCell>
              )}
            </LegacyTableRow>
          </LegacyTableHeader>
        )}
        <LegacyTableBody id={`group-${id}-table-body`}>
          {visibleRowIndexes.map((index: number) => {
            const isEditingRow = isEditing(index) && edit?.mode !== 'onlyTable';
            return (
              <React.Fragment key={index}>
                <RepeatingGroupTableRow
                  className={cn({
                    [classes.editingRow]: isEditingRow,
                  })}
                  index={index}
                  getTableNodes={getTableNodes}
                  mobileView={mobileView}
                  displayDeleteColumn={displayDeleteColumn}
                  displayEditColumn={displayEditColumn}
                />
                {isEditingRow && (
                  <LegacyTableRow
                    key={`edit-container-${index}`}
                    className={classes.editContainerRow}
                  >
                    <LegacyTableCell
                      style={{ padding: 0, borderTop: 0 }}
                      colSpan={
                        mobileView
                          ? 2
                          : tableNodes.length + 3 + (displayEditColumn ? 1 : 0) + (displayDeleteColumn ? 1 : 0)
                      }
                    >
                      {edit?.mode !== 'onlyTable' && <RepeatingGroupsEditContainer editIndex={index} />}
                    </LegacyTableCell>
                  </LegacyTableRow>
                )}
              </React.Fragment>
            );
          })}
        </LegacyTableBody>
        <RenderExtraRows
          rows={rowsAfter}
          where={'After'}
        />
      </LegacyTable>
    </div>
  );
}
