import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import { Heading, Table, ValidationMessage } from '@digdir/designsystemet-react';
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
import utilClasses from 'src/styles/utils.module.css';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type {
  GridCell,
  GridCellLabelFrom,
  GridCellText,
  GridComponentRef,
  GridRow,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { EditButtonProps } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type GridSummaryProps = Readonly<{
  componentNode: LayoutNode<'Grid'>;
}>;

export const GridSummary = ({ componentNode }: GridSummaryProps) => {
  const { rows, textResourceBindings } = useNodeItem(componentNode);
  const { title } = textResourceBindings ?? {};

  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const isSmall = isMobile && !pdfModeActive;

  const tableSections: JSX.Element[] = [];
  let currentHeaderRow: GridRow | undefined = undefined;
  let currentBodyRows: GridRow[] = [];

  rows.forEach((row, index) => {
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
      <tbody key={`tbody-${rows.length}`}>
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
              data-size='xs'
              level={4}
            >
              <Lang id={title} />
            </Heading>
          </caption>
        )}
        {tableSections}
      </Table>
    </SummaryFlexForContainer>
  );
};

interface GridRowProps {
  row: GridRow;
  mutableColumnSettings: ITableColumnFormatting;
  node: LayoutNode<'Grid'>;
  headerRow?: GridRow;
}

function SummaryGridRowRenderer(props: GridRowProps) {
  const { row } = props;
  const isMobile = useIsMobile();
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const firstNodeId = useFirstFormNodeId(row);

  const idMutator = useComponentIdMutator();
  const onlyEmptyChildren = useHasOnlyEmptyChildren();
  const isHeaderWithoutComponents = row.header === true && !row.cells.some((cell) => cell && 'component' in cell);
  const hideEmptyRows = useSummaryOverrides(props.node)?.hideEmptyRows;

  useReportSummaryRenderToParent(
    isHeaderWithoutComponents
      ? SummaryContains.Presentational
      : onlyEmptyChildren
        ? SummaryContains.EmptyValueNotRequired
        : SummaryContains.SomeUserContent,
  );

  if (isGridRowHidden(row, isHiddenSelector, idMutator)) {
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
              <span className={utilClasses.visuallyHidden}>
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

function useFirstFormNodeId(row: GridRow): string | undefined {
  const idMutator = useComponentIdMutator();
  const canRender = useHasCapability('renderInTable');
  return NodesInternal.useSelector((state) => {
    for (const cell of row.cells) {
      if (cell && 'component' in cell && cell.component && canRender(cell.component)) {
        const nodeId = idMutator(cell.component);
        const nodeData = state.nodeData?.[nodeId];
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

interface CellProps extends GridRowProps {
  cell: GridCell;
  idx: number;
  isSmall: boolean;
}

function SummaryCell(props: CellProps) {
  const cell = props.headerRow?.cells[props.idx];
  const referencedNode = useNode(cell && 'labelFrom' in cell ? cell.labelFrom : undefined);
  const { langAsString } = useLanguage();

  if (referencedNode) {
    return (
      <SummaryCellInnerWithLabel
        {...props}
        labelFrom={referencedNode}
      />
    );
  }

  return (
    <SummaryCellInner
      {...props}
      headerTitle={cell && 'text' in cell ? langAsString(cell.text) : ''}
    />
  );
}

function SummaryCellInnerWithLabel(props: CellProps & { labelFrom: LayoutNode }) {
  const { langAsString, langAsNonProcessedString } = useLanguage();
  const required = useNodeItem(props.labelFrom, (i) => ('required' in i ? i.required : false));
  const title = useNodeItem(props.labelFrom, (i) =>
    i.textResourceBindings && 'title' in i.textResourceBindings ? i.textResourceBindings.title : undefined,
  );
  const requiredIndicator = required ? ` ${langAsNonProcessedString('form_filler.required_label')}` : '';
  const headerTitle = `${langAsString(title || '')}${requiredIndicator}`;

  return (
    <SummaryCellInner
      {...props}
      headerTitle={headerTitle}
    />
  );
}

function SummaryCellInner({
  cell,
  idx,
  headerTitle,
  mutableColumnSettings,
  row,
  isSmall,
}: CellProps & { headerTitle: string }) {
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
          <Lang id={cell.text} />
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

  if (cell && 'component' in cell) {
    return (
      <SummaryCellWithComponentNodeCheck
        key={`${cell.component}/${idx}`}
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
  cell: GridComponentRef;
}

interface CellWithTextProps extends PropsWithChildren, BaseCellProps {
  cell: GridCellText;
}

interface CellWithLabelProps extends BaseCellProps {
  cell: GridCellLabelFrom;
}

function SummaryCellWithComponentNodeCheck(props: CellWithComponentProps) {
  const nodeId = useIndexedId(props.cell.component ?? '');
  const node = useNode(nodeId);
  const canRender = useHasCapability('renderInTable');
  if (!node || !canRender(props.cell.component)) {
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
          <ValidationMessage
            key={message.key}
            data-size='sm'
          >
            <Lang
              id={message.key}
              params={message.params}
            />
          </ValidationMessage>
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
