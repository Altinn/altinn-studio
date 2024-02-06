import React from 'react';
import type { PropsWithChildren } from 'react';

import {
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
} from '@digdir/design-system-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Caption } from 'src/components/form/Caption';
import { Description } from 'src/components/form/Description';
import { Fieldset } from 'src/components/form/Fieldset';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Label } from 'src/components/form/Label';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { GenericComponent } from 'src/layout/GenericComponent';
import css from 'src/layout/Grid/Grid.module.css';
import { isGridRowHidden, nodesFromGrid } from 'src/layout/Grid/tools';
import { getColumnStyles } from 'src/utils/formComponentUtils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { GridRowInternal, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/common.generated';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function RenderGrid(props: PropsFromGenericComponent<'Grid'>) {
  const { node } = props;
  const { rows, textResourceBindings, labelSettings } = node.item;
  const { title, description, help } = textResourceBindings ?? {};
  const shouldHaveFullWidth = node.parent instanceof LayoutPage;
  const columnSettings: ITableColumnFormatting = {};
  const isMobile = useIsMobile();
  const isNested = node.parent instanceof BaseLayoutNode;

  if (isMobile) {
    return <MobileGrid {...props} />;
  }

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <LegacyTable id={node.item.id}>
        {title && (
          <Caption
            className={cn({ [css.captionFullWidth]: shouldHaveFullWidth })}
            title={<Lang id={title} />}
            description={<Lang id={description} />}
            helpText={help}
            labelSettings={labelSettings}
          />
        )}
        {rows.map((row, rowIdx) => (
          <GridRowRenderer
            key={rowIdx}
            row={row}
            isNested={isNested}
            mutableColumnSettings={columnSettings}
            node={node}
          />
        ))}
      </LegacyTable>
    </ConditionalWrapper>
  );
}

interface GridRowProps {
  row: GridRowInternal;
  isNested: boolean;
  mutableColumnSettings: ITableColumnFormatting;
  node: LayoutNode;
}

export function GridRowRenderer({ row, isNested, mutableColumnSettings, node }: GridRowProps) {
  return isGridRowHidden(row) ? null : (
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

        if (cell && ('labelFrom' in cell || 'text' in cell)) {
          let textCellSettings: ITableColumnProperties = mutableColumnSettings[cellIdx]
            ? structuredClone(mutableColumnSettings[cellIdx])
            : {};
          textCellSettings = { ...textCellSettings, ...cell };

          if ('text' in cell && cell.text) {
            return (
              <CellWithText
                key={`${cell.text}/${cellIdx}`}
                className={className}
                help={cell?.help}
                columnStyleOptions={textCellSettings}
              >
                <Lang
                  id={cell.text}
                  node={node}
                />
              </CellWithText>
            );
          }

          if ('labelFrom' in cell && cell.labelFrom) {
            const closestComponent = node
              .flat(true)
              .find((n) => n.item.id === cell.labelFrom || n.item.baseComponentId === cell.labelFrom);
            return (
              <CellWithLabel
                key={`${cell.labelFrom}/${cellIdx}`}
                className={className}
                columnStyleOptions={textCellSettings}
                referenceComponent={closestComponent}
              />
            );
          }
        }
        const componentNode = cell && 'node' in cell ? cell.node : undefined;
        const componentId = componentNode && componentNode.item.id;
        return (
          <CellWithComponent
            key={`${componentId}/${cellIdx}`}
            node={componentNode}
            className={className}
            columnStyleOptions={mutableColumnSettings[cellIdx]}
          />
        );
      })}
    </InternalRow>
  );
}

type InternalRowProps = PropsWithChildren<Pick<GridRowInternal, 'header' | 'readOnly'>>;

function InternalRow({ header, readOnly, children }: InternalRowProps) {
  const className = readOnly ? css.rowReadOnly : undefined;

  if (header) {
    return (
      <LegacyTableHeader>
        <LegacyTableRow className={className}>{children}</LegacyTableRow>
      </LegacyTableHeader>
    );
  }

  return (
    <LegacyTableBody>
      <LegacyTableRow className={className}>{children}</LegacyTableRow>
    </LegacyTableBody>
  );
}

interface CellProps {
  className?: string;
  columnStyleOptions?: ITableColumnProperties;
}

interface CellWithComponentProps extends CellProps {
  node?: LayoutNode;
}

interface CellWithTextProps extends PropsWithChildren, CellProps {
  help?: string;
}

interface CellWithLabelProps extends CellProps {
  referenceComponent?: LayoutNode;
}

function CellWithComponent({ node, className, columnStyleOptions }: CellWithComponentProps) {
  if (node && !node.isHidden()) {
    const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
    return (
      <LegacyTableCell
        className={cn(css.tableCellFormatting, className)}
        style={columnStyles}
      >
        <GenericComponent
          node={node}
          overrideDisplay={{
            renderLabel: false,
            renderLegend: false,
            renderedInTable: true,
          }}
        />
      </LegacyTableCell>
    );
  }

  return <LegacyTableCell className={className} />;
}

function CellWithText({ children, className, columnStyleOptions, help }: CellWithTextProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const { elementAsString } = useLanguage();
  return (
    <LegacyTableCell
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
    </LegacyTableCell>
  );
}

function CellWithLabel({ className, columnStyleOptions, referenceComponent }: CellWithLabelProps) {
  const columnStyles = columnStyleOptions && getColumnStyles(columnStyleOptions);
  const refItem = referenceComponent?.item;
  const trb = (refItem && 'textResourceBindings' in refItem ? refItem.textResourceBindings : {}) as
    | ITextResourceBindings
    | undefined;
  const title = trb && 'title' in trb ? trb.title : undefined;
  const help = trb && 'help' in trb ? trb.help : undefined;
  const description = trb && 'description' in trb ? trb.description : undefined;
  const required =
    (referenceComponent && 'required' in referenceComponent.item && referenceComponent.item.required) ?? false;
  const componentId = referenceComponent?.item.id ?? referenceComponent?.item.baseComponentId;

  return (
    <LegacyTableCell
      className={cn(css.tableCellFormatting, className)}
      style={columnStyles}
    >
      {componentId && (
        <>
          <span className={css.textLabel}>
            <Label
              key={`label-${componentId}`}
              label={title}
              id={componentId}
              required={required}
              helpText={<Lang id={help} />}
            />
          </span>
          <Description
            id={componentId}
            description={description}
          />
        </>
      )}
    </LegacyTableCell>
  );
}

function MobileGrid({ node }: PropsFromGenericComponent<'Grid'>) {
  const { textResourceBindings, id, labelSettings } = node.item;
  const { title, description, help } = textResourceBindings ?? {};
  return (
    <Fieldset
      id={id}
      legend={title && <Lang id={title} />}
      description={title && <Lang id={description} />}
      helpText={help}
      labelSettings={labelSettings}
      className={css.mobileFieldset}
    >
      {nodesFromGrid(node)
        .filter((child) => !child.isHidden())
        .map((child) => (
          <GenericComponent
            key={child.item.id}
            node={child}
          />
        ))}
    </Fieldset>
  );
}
