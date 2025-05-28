import React from 'react';

import { ErrorMessage, Table } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useIndexedComponentIds } from 'src/features/form/layout/utils/makeIndexedId';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useRepeatingGroupRowState } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import repeatingGroupClasses from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import tableClasses from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary.module.css';
import { RepeatingGroupTableTitle, useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { EditButtonById } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummaryById, SummaryContains } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider, useDataModelLocationForRow } from 'src/utils/layout/DataModelLocation';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { RepGroupRow } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const RepeatingGroupTableSummary = ({ componentNode }: { componentNode: LayoutNode<'RepeatingGroup'> }) => {
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const { visibleRows } = useRepeatingGroupRowState();
  const rowsToDisplaySet = new Set(visibleRows.map((row) => row.uuid));
  const rows = useNodeItem(componentNode, (i) => i.rows).filter((row) => row && rowsToDisplaySet.has(row.uuid));
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const dataModelBindings = useNodeItem(componentNode, (i) => i.dataModelBindings);
  const locationForFirstRow = useDataModelLocationForRow(dataModelBindings.group, 0);
  const tableIds = useIndexedComponentIds(useTableComponentIds(componentNode), locationForFirstRow);
  const { tableColumns } = useNodeItem(componentNode);
  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);

  return (
    <div
      className={cn(classes.summaryWrapper)}
      data-testid='summary-repeating-group-component'
    >
      <Table className={cn({ [tableClasses.mobileTable]: isSmall })}>
        <Caption title={<Lang id={title} />} />
        <Table.Head>
          <Table.Row>
            {tableIds.map((id) => (
              <HeaderCell
                key={id}
                nodeId={id}
                columnSettings={columnSettings}
              />
            ))}
            {!pdfModeActive && !isSmall && (
              <Table.HeaderCell className={tableClasses.narrowLastColumn}>
                <span className={tableClasses.visuallyHidden}>
                  <Lang id='general.edit' />
                </span>
              </Table.HeaderCell>
            )}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row, index) => (
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={row?.index ?? index}
              key={`${row?.uuid}-${index}`}
            >
              <DataRow
                row={row}
                node={componentNode}
                pdfModeActive={pdfModeActive}
                columnSettings={columnSettings}
              />
            </DataModelLocationProvider>
          ))}
        </Table.Body>
      </Table>
      {errors?.map(({ message }) => (
        <ErrorMessage
          key={message.key}
          className={classes.errorMessage}
        >
          <ExclamationmarkTriangleIcon fontSize='1.5rem' />
          <Lang
            id={message.key}
            params={message.params}
            node={componentNode}
          />
        </ErrorMessage>
      ))}
    </div>
  );
};

function HeaderCell({ nodeId, columnSettings }: { nodeId: string; columnSettings: ITableColumnFormatting }) {
  const node = useNode(nodeId);
  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  return (
    <Table.HeaderCell style={style}>
      <RepeatingGroupTableTitle
        node={node}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}

type DataRowProps = {
  row: RepGroupRow | undefined;
  node: LayoutNode<'RepeatingGroup'>;
  pdfModeActive: boolean;
  columnSettings: ITableColumnFormatting;
};

function DataRow({ row, node, pdfModeActive, columnSettings }: DataRowProps) {
  const layoutLookups = useLayoutLookups();
  const rawIds = useTableComponentIds(node);
  const indexedIds = useIndexedComponentIds(rawIds);
  const dataModelBindings = useNodeItem(node, (i) => i.dataModelBindings);

  if (!row) {
    return null;
  }

  return (
    <DataModelLocationProvider
      groupBinding={dataModelBindings.group}
      rowIndex={row.index}
    >
      <Table.Row>
        {indexedIds.map((id, index) =>
          layoutLookups.getComponent(rawIds[index]).type === 'Custom' ? (
            <Table.Cell key={id}>
              <ComponentSummaryById componentId={id} />
            </Table.Cell>
          ) : (
            <DataCell
              key={id}
              nodeId={id}
              columnSettings={columnSettings}
            />
          ),
        )}
        {!pdfModeActive && (
          <Table.Cell
            align='right'
            className={tableClasses.buttonCell}
          >
            {row?.itemIds && row?.itemIds?.length > 0 && indexedIds.length > 0 && <EditButtonById id={indexedIds[0]} />}
          </Table.Cell>
        )}
      </Table.Row>
    </DataModelLocationProvider>
  );
}

type DataCellProps = {
  nodeId: string;
  columnSettings: ITableColumnFormatting;
};

function DataCell({ nodeId, columnSettings }: DataCellProps) {
  const node = useNode(nodeId);
  if (!node) {
    return null;
  }

  return (
    <NodeDataCell
      node={node}
      columnSettings={columnSettings}
    />
  );
}

function NodeDataCell({ node, columnSettings }: { node: LayoutNode } & Pick<DataCellProps, 'columnSettings'>) {
  const { langAsString } = useLanguage();
  const headerTitle = langAsString(useTableTitle(node));
  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  const displayData = useDisplayData(node);
  const required = useNodeItem(node, (i) => ('required' in i ? i.required : false));

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <Table.Cell
      key={node.id}
      data-header-title={headerTitle}
    >
      <span
        className={repeatingGroupClasses.contentFormatting}
        style={style}
      >
        {displayData}
      </span>
    </Table.Cell>
  );
}
