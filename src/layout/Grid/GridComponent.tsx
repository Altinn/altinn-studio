import React from 'react';
import type { PropsWithChildren } from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Caption } from 'src/components/form/caption/Caption';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { LabelContent } from 'src/components/label/LabelContent';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { GenericComponent, GenericComponentById } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import {
  isGridCellLabelFrom,
  isGridCellNode,
  isGridCellText,
  isGridRowHidden,
  useNodeIdsFromGrid,
} from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { GridRow, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/common.generated';

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { node } = props;
  const { rows, textResourceBindings, labelSettings } = useItemWhenType(node.baseId, 'Grid');
  const { title, description, help } = textResourceBindings ?? {};
  const shouldHaveFullWidth = node.parent instanceof LayoutPage;
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const parent = useLayoutLookups().componentToParent[node.baseId];
  const isNested = parent?.type === 'node';
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);

  if (isMobile) {
    return <MobileGrid {...props} />;
  }

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <Table
        id={node.id}
        className={css.table}
      >
        {title && (
          <Caption
            className={cn({ [css.captionFullWidth]: shouldHaveFullWidth })}
            title={<Lang id={title} />}
            description={description && <Lang id={description} />}
            helpText={help ? { text: <Lang id={help} />, accessibleTitle } : undefined}
            labelSettings={labelSettings}
          />
        )}
        {rows.map((row, rowIdx) => (
          <GridRowRenderer
            key={rowIdx}
            row={row}
            isNested={isNested}
            mutableColumnSettings={columnSettings}
          />
        ))}
      </Table>
    </ConditionalWrapper>
  );
}

interface GridRowProps {
  row: GridRow;
  isNested: boolean;
  mutableColumnSettings: ITableColumnFormatting;
}

export function GridRowRenderer({ row, isNested, mutableColumnSettings }: GridRowProps) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const idMutator = useComponentIdMutator();
  if (isGridRowHidden(row, isHiddenSelector, idMutator)) {
    return null;
  }

  return (
    <InternalRow
      header={row.header}
      readOnly={row.readOnly}
    >
      {row.cells.map((cell, cellIdx) => {
        const isFirst = cellIdx === 0;
        const isLast = cellIdx === row.cells.length - 1;
        const className = cn({
          [css.fullWidthCellFirst]: isFirst && !isNested,
          [css.fullWidthCellLast]: isLast && !isNested,
        });

        if (row.header && cell && 'columnOptions' in cell && cell.columnOptions) {
          mutableColumnSettings[cellIdx] = cell.columnOptions;
        }

        if (isGridCellText(cell) || isGridCellLabelFrom(cell)) {
          let textCellSettings: ITableColumnProperties = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};
          textCellSettings = { ...textCellSettings, ...cell };

          if (isGridCellText(cell)) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                className={className}
                help={cell?.help}
                isHeader={row.header}
                columnStyleOptions={textCellSettings}
              >
                <Lang id={cell.text} />
              </CellWithText>
            );
          }

          return (
            <CellWithLabel
              key={`${cell.labelFrom}/${cellIdx}`}
              className={className}
              isHeader={row.header}
              columnStyleOptions={textCellSettings}
              labelFrom={cell.labelFrom}
            />
          );
        }
        const baseComponentId = isGridCellNode(cell) ? cell.component : undefined;
        const componentId = baseComponentId && idMutator ? idMutator(baseComponentId) : baseComponentId;
        return (
          <CellWithComponent
            rowReadOnly={row.readOnly}
            key={`${componentId}/${cellIdx}`}
            nodeId={componentId}
            isHeader={row.header}
            className={className}
            columnStyleOptions={mutableColumnSettings[cellIdx]}
          />
        );
      })}
    </InternalRow>
  );
}

type InternalRowProps = PropsWithChildren<Pick<GridRow, 'header' | 'readOnly'>>;

function InternalRow({ header, readOnly, children }: InternalRowProps) {
  const className = readOnly ? css.rowReadOnly : undefined;

  if (header) {
    return (
      <Table.Head>
        <Table.Row className={className}>{children}</Table.Row>
      </Table.Head>
    );
  }

  return <Table.Row className={className}>{children}</Table.Row>;
}

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
  isHeader?: boolean;
  rowReadOnly?: boolean;
}

interface CellWithComponentProps extends CellProps {
  nodeId: string | undefined;
}

interface CellWithTextProps extends PropsWithChildren, CellProps {
  help?: string;
}

interface CellWithLabelProps extends CellProps {
  labelFrom: string;
}

function CellWithComponent({
  nodeId,
  className,
  columnStyleOptions,
  isHeader = false,
  rowReadOnly,
}: CellWithComponentProps) {
  const node = useNode(nodeId);
  const isHidden = Hidden.useIsHidden(node);
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  if (node && !isHidden) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <CellComponent
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
      >
        <GenericComponent
          node={node}
          overrideDisplay={{
            renderLabel: false,
            renderLegend: false,
            renderedInTable: true,
            rowReadOnly,
          }}
        />
      </CellComponent>
    );
  }

  return <CellComponent className={className} />;
}

function CellWithText({ children, className, columnStyleOptions, help, isHeader = false }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      <span className={help && css.textCell}>
        <span
          className={css.contentFormatting}
          style={columnStyles}
        >
          {children}
        </span>
        {help && (
          <HelpTextContainer
            title={elementAsString(children)}
            helpText={<Lang id={help} />}
          />
        )}
      </span>
    </CellComponent>
  );
}

function CellWithLabel({ className, columnStyleOptions, labelFrom, isHeader = false }: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const labelFromNode = useNode(labelFrom);
  const item = useItemFor(labelFromNode.baseId);
  const trb = item.textResourceBindings;
  const required = 'required' in item && item.required;

  const title = trb && 'title' in trb ? trb.title : undefined;
  const help = trb && 'help' in trb ? trb.help : undefined;
  const description = trb && 'description' in trb && typeof trb.description === 'string' ? trb.description : undefined;
  const CellComponent = isHeader ? Table.HeaderCell : Table.Cell;

  return (
    <CellComponent
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      {labelFromNode && (
        <LabelContent
          componentId={labelFromNode.id}
          label={title}
          required={required}
          help={help}
          description={description}
        />
      )}
    </CellComponent>
  );
}

function MobileGrid({ node, overrideDisplay }: PropsFromGenericComponent<'Grid'>) {
  const nodeIds = useNodeIdsFromGrid(node);
  const isHidden = Hidden.useIsHiddenSelector();

  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId: node.baseId,
    overrideDisplay,
  });

  return (
    <Fieldset
      id={node.id}
      size='sm'
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
      className={css.mobileFieldset}
    >
      {nodeIds
        .filter((childId) => !isHidden(childId))
        .map((childId) => (
          <GenericComponentById
            key={childId}
            id={childId}
          />
        ))}
    </Fieldset>
  );
}
