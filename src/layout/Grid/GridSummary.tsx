import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import { ErrorMessage, Heading, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { LabelContent } from 'src/components/label/LabelContent';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { getComponentDef, implementsDisplayData } from 'src/layout';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Grid/GridSummary.module.css';
import { isGridRowHidden } from 'src/layout/Grid/tools';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import {
  EmptyChildrenBoundary,
  useHasOnlyEmptyChildren,
  useReportSummaryRender,
  useReportSummaryRenderToParent,
} from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import {
  ComponentSummary,
  HideWhenAllChildrenEmpty,
  SummaryContains,
  SummaryFlexForContainer,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { Hidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type {
  GridCellLabelFrom,
  GridCellText,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { GridCellInternal, GridCellNode, GridRowInternal } from 'src/layout/Grid/types';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { EditButtonProps } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type GridSummaryProps = Readonly<{
  componentNode: LayoutNode<'Grid'>;
}>;

export const GridSummary = ({ componentNode }: GridSummaryProps) => {
  const { rowsInternal, textResourceBindings } = useNodeItem(componentNode);
  const { title } = textResourceBindings ?? {};

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const isSmall = isMobile && !pdfModeActive;

  const tableSections: JSX.Element[] = [];
  let currentHeaderRow: GridRowInternal | undefined = undefined;
  let currentBodyRows: GridRowInternal[] = [];

  rowsInternal.forEach((row, index) => {
    if (row.header) {
      // If there are accumulated body rows, push them into a tbody
      if (currentBodyRows.length > 0) {
        tableSections.push(
          <Table.Body key={`tbody-${index}`}>
            {currentBodyRows.map((bodyRow, bodyIndex) => (
              <EmptyChildrenBoundary
                key={bodyIndex}
                reportSelf={false}
              >
                <SummaryGridRowRenderer
                  row={bodyRow}
                  mutableColumnSettings={columnSettings}
                  node={componentNode}
                />
              </EmptyChildrenBoundary>
            ))}
          </Table.Body>,
        );
        currentBodyRows = [];
      }
      // Add the header row
      tableSections.push(
        <Table.Head key={`thead-${index}`}>
          <EmptyChildrenBoundary
            key={index}
            reportSelf={false}
          >
            <SummaryGridRowRenderer
              row={row}
              mutableColumnSettings={columnSettings}
              node={componentNode}
              headerRow={currentHeaderRow}
            />
          </EmptyChildrenBoundary>
        </Table.Head>,
      );
      currentHeaderRow = row;
    } else {
      // Add to the current body rows
      currentBodyRows.push(row);
    }
  });

  // Push remaining body rows if any
  if (currentBodyRows.length > 0) {
    tableSections.push(
      <tbody key={`tbody-${rowsInternal.length}`}>
        {currentBodyRows.map((bodyRow, bodyIndex) => (
          <EmptyChildrenBoundary
            key={bodyIndex}
            reportSelf={false}
          >
            <SummaryGridRowRenderer
              row={bodyRow}
              mutableColumnSettings={columnSettings}
              node={componentNode}
              headerRow={currentHeaderRow}
            />
          </EmptyChildrenBoundary>
        ))}
      </tbody>,
    );
  }

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={componentNode}
    >
      <Table
        id={componentNode.id}
        className={cn(classes.table, { [classes.responsiveTable]: isSmall })}
        data-testid={`summary-${componentNode.id}`}
      >
        {title && (
          <caption className={classes.tableCaption}>
            <Heading
              size='xs'
              level={4}
            >
              <Lang
                id={title}
                node={componentNode}
              />
            </Heading>
          </caption>
        )}
        {tableSections}
      </Table>
    </SummaryFlexForContainer>
  );
};

interface GridRowProps {
  row: GridRowInternal;
  mutableColumnSettings: ITableColumnFormatting;
  node: LayoutNode<'Grid'>;
  headerRow?: GridRowInternal;
}

function SummaryGridRowRenderer(props: GridRowProps) {
  const { row } = props;
  const isMobile = useIsMobile();
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const firstNodeId = useFirstFormNodeId(row);

  const onlyEmptyChildren = useHasOnlyEmptyChildren();
  const isHeaderWithoutComponents = row.header === true && !row.cells.some((cell) => cell && 'nodeId' in cell);
  const hideEmptyRows = useSummaryOverrides(props.node)?.hideEmptyRows;

  useReportSummaryRenderToParent(
    isHeaderWithoutComponents
      ? SummaryContains.Presentational
      : onlyEmptyChildren
        ? SummaryContains.EmptyValueNotRequired
        : SummaryContains.SomeUserContent,
  );

  if (isGridRowHidden(row, isHiddenSelector)) {
    return null;
  }

  const extraClassName = row.readOnly ? classes.rowReadOnly : undefined;

  return (
    <HideWhenAllChildrenEmpty
      hideWhen={hideEmptyRows}
      render={(className) => (
        <Table.Row className={cn(className, extraClassName)}>
          {row.cells.filter(typedBoolean).map((cell, cellIdx) => (
            <SummaryCell
              key={cellIdx}
              cell={cell}
              idx={cellIdx}
              isSmall={isSmall}
              {...props}
            />
          ))}
          {!pdfModeActive && row.header && !isSmall && (
            <Table.HeaderCell>
              <span className={classes.visuallyHidden}>
                <Lang id='general.edit' />
              </span>
            </Table.HeaderCell>
          )}
          {!pdfModeActive && !row.header && !isSmall && (
            <Table.Cell align='right'>
              {firstNodeId && !row.readOnly && (
                <WrappedEditButton
                  componentNodeId={firstNodeId}
                  summaryComponentId=''
                />
              )}
            </Table.Cell>
          )}
        </Table.Row>
      )}
    />
  );
}

function useFirstFormNodeId(row: GridRowInternal): string | undefined {
  return NodesInternal.useSelector((state) => {
    for (const cell of row.cells) {
      if (cell && 'nodeId' in cell && cell.nodeId) {
        const nodeData = state.nodeData?.[cell.nodeId];
        const def = nodeData && getComponentDef(nodeData.layout.type);
        if (def && def.category === CompCategory.Form) {
          return nodeData.layout.id;
        }
      }
    }
    return undefined;
  });
}

function WrappedEditButton({
  componentNodeId,
  ...rest
}: { componentNodeId: string } & Omit<EditButtonProps, 'componentNode'>) {
  const node = useNode(componentNodeId);
  if (!node) {
    return null;
  }

  return (
    <EditButton
      componentNode={node}
      {...rest}
    />
  );
}

function useHeaderText(headerRow: GridRowInternal | undefined, cellIdx: number) {
  const { langAsString, langAsNonProcessedString } = useLanguage();
  const cell = headerRow?.cells[cellIdx] ?? undefined;
  const referencedNode = useNode(cell && 'labelFrom' in cell ? cell.labelFrom : undefined);
  const referencedNodeIsRequired = useNodeItem(referencedNode, (i) => ('required' in i ? i.required : false));
  const referencedNodeTitle = useNodeItem(referencedNode, (i) =>
    i.textResourceBindings && 'title' in i.textResourceBindings ? i.textResourceBindings.title : undefined,
  );
  const requiredIndicator = referencedNodeIsRequired
    ? ` ${langAsNonProcessedString('form_filler.required_label')}`
    : '';

  let headerText = '';
  if (cell && 'text' in cell) {
    headerText = cell.text;
  } else if (cell && 'labelFrom' in cell) {
    headerText = referencedNodeTitle ? referencedNodeTitle : '';
  }

  return `${langAsString(headerText)}${requiredIndicator}`;
}

interface CellProps extends GridRowProps {
  cell: GridCellInternal;
  idx: number;
  isSmall: boolean;
}

function SummaryCell({ cell, idx: idx, headerRow, mutableColumnSettings, row, node, isSmall }: CellProps) {
  const headerTitle = useHeaderText(headerRow, idx);
  if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
    mutableColumnSettings[idx] = cell.columnOptions;
  }

  const baseProps: Omit<BaseCellProps, 'columnStyleOptions'> = {
    rowReadOnly: row.readOnly,
    isHeader: row.header,
    isSmall,
  };

  if (cell && ('labelFrom' in cell || 'text' in cell)) {
    let textCellSettings: ITableColumnProperties = mutableColumnSettings[idx]
      ? structuredClone(mutableColumnSettings[idx])
      : {};
    textCellSettings = { ...textCellSettings, ...cell };

    if ('text' in cell && cell.text) {
      return (
        <SummaryCellWithText
          key={`${cell.text}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        >
          <Lang
            id={cell.text}
            node={node}
          />
        </SummaryCellWithText>
      );
    }

    if ('labelFrom' in cell && cell.labelFrom) {
      return (
        <SummaryCellWithLabel
          key={`${cell.labelFrom}/${idx}`}
          cell={cell}
          columnStyleOptions={textCellSettings}
          headerTitle={headerTitle}
          {...baseProps}
        />
      );
    }
  }

  if (cell && 'nodeId' in cell) {
    return (
      <SummaryCellWithComponentNodeCheck
        key={`${cell.nodeId}/${idx}`}
        cell={cell}
        columnStyleOptions={mutableColumnSettings[idx]}
        headerTitle={headerTitle}
        {...baseProps}
      />
    );
  }

  const CellComponent = row.header ? Table.HeaderCell : Table.Cell;
  return <CellComponent />;
}

interface BaseCellProps {
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
  headerTitle?: string;
  isSmall?: boolean;
}

interface CellWithComponentProps extends BaseCellProps {
  cell: GridCellNode;
}

interface CellWithTextProps extends PropsWithChildren, BaseCellProps {
  cell: GridCellText;
}

interface CellWithLabelProps extends BaseCellProps {
  cell: GridCellLabelFrom;
}

function SummaryCellWithComponentNodeCheck(props: CellWithComponentProps) {
  const node = useNode(props.cell.nodeId);
  if (!node) {
    return <Table.Cell />;
  }

  return (
    <SummaryCellWithComponent
      {...props}
      node={node}
    />
  );
}

function SummaryCellWithComponent({
  node,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
  headerTitle,
  isSmall,
}: CellWithComponentProps & { node: LayoutNode }) {
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;
  const displayData = useDisplayData(node);
  const validations = useUnifiedValidationsForNode(node);
  const errors = validationsOfSeverity(validations, 'error');
  const isHidden = Hidden.useIsHidden(node);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings);
  const required = useNodeItem(node, (i) => ('required' in i ? i.required : false));
  const content = getComponentCellData(node, displayData, textResourceBindings);

  const isEmpty = typeof content === 'string' && content.trim() === '';
  useReportSummaryRender(
    isEmpty
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  if (isHidden) {
    return <CellComponent />;
  }

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
      data-is-empty={isEmpty ? 'yes' : 'no'}
      data-cell-node={node.id}
    >
      <div className={cn(classes.contentWrapper, { [classes.validationError]: errors.length > 0 })}>
        {content}
        {isSmall && !rowReadOnly && (
          <EditButton
            className={classes.mobileEditButton}
            componentNode={node}
            summaryComponentId=''
          />
        )}
      </div>
      <div className={cn({ [classes.errorMessage]: errors.length > 0 })} />
      {errors.length > 0 &&
        errors.map(({ message }) => (
          <ErrorMessage key={message.key}>
            <Lang
              id={message.key}
              params={message.params}
              node={node}
            />
          </ErrorMessage>
        ))}
    </CellComponent>
  );
}

function SummaryCellWithText({
  children,
  columnStyleOptions,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      <span
        className={classes.contentFormatting}
        style={columnStyles}
      >
        {children}
      </span>
    </CellComponent>
  );
}

function SummaryCellWithLabel({
  cell,
  columnStyleOptions,
  isHeader = false,
  headerTitle,
  isSmall,
}: CellWithLabelProps) {
  const referenceNode = useNode(cell.labelFrom);
  const refItem = useNodeItem(referenceNode);
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const required = (referenceNode && refItem && 'required' in refItem && refItem.required) ?? false;

  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  if (!referenceNode) {
    return <CellComponent />;
  }

  return (
    <CellComponent
      className={classes.tableCellFormatting}
      style={columnStyles}
      data-header-title={isSmall ? headerTitle : ''}
    >
      {referenceNode && (
        <LabelContent
          componentId={referenceNode.id}
          label={title}
          required={required}
        />
      )}
    </CellComponent>
  );
}

function getComponentCellData(node: LayoutNode, displayData: string, textResourceBindings?: ITextResourceBindings) {
  if (node?.type === 'Custom') {
    return <ComponentSummary target={node} />;
  } else if (implementsDisplayData(node.def)) {
    return displayData || '';
  } else if (textResourceBindings && 'title' in textResourceBindings) {
    return <Lang id={textResourceBindings.title} />;
  } else {
    return (
      <GenericComponent
        node={node}
        overrideDisplay={{
          renderLabel: false,
          renderLegend: false,
          renderedInTable: true,
        }}
      />
    );
  }
}
