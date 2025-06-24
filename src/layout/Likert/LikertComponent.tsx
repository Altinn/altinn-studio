import React from 'react';

import { Heading, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import type { PropsFromGenericComponent } from '..';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Description } from 'src/components/form/Description';
import { getDescriptionId, getLabelId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { LayoutStyle } from 'src/layout/common.generated';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import classes from 'src/layout/Likert/LikertComponent.module.css';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type LikertComponentProps = PropsFromGenericComponent<'Likert'>;

export const LikertComponent = ({ node }: LikertComponentProps) => {
  const groupBinding = useNodeItem(node, (item) => item.dataModelBindings.questions);
  const textResourceBindings = useNodeItem(node, (item) => item.textResourceBindings);
  const mobileView = useIsMobileOrTablet();
  const rows = useLikertRows(node);
  const firstRow = rows.find((row) => !!row);
  const firstLikertNodeId = firstRow && makeLikertChildId(node.id, firstRow.index);
  const firstLikertNode = useNode(firstLikertNodeId) as LayoutNode<'LikertItem'> | undefined;
  const { options: calculatedOptions, isFetching } = useNodeOptions(firstLikertNode);
  const columns = useNodeItem(node, (item) => item.columns);

  const id = node.id;

  const title = textResourceBindings?.title;
  const description = textResourceBindings?.description;

  if (mobileView) {
    return (
      <ComponentStructureWrapper
        node={node}
        data-componentid={node.id}
        data-componentbaseid={node.baseId}
      >
        {title && (
          <div
            className={classes.likertHeading}
            id={getLabelId(node.id)}
          >
            <Heading
              level={2}
              data-size='sm'
            >
              <Lang id={title} />
            </Heading>
            {description && (
              <Description
                description={<Lang id={description} />}
                componentId={node.id}
              />
            )}
          </div>
        )}
        <div
          role='group'
          className={classes.likertMobileGroup}
          aria-labelledby={textResourceBindings?.title ? getLabelId(node.id) : undefined}
          aria-describedby={textResourceBindings?.description ? getDescriptionId(node.id) : undefined}
        >
          {rows.map((row) =>
            row ? (
              <DataModelLocationProvider
                key={row.index}
                groupBinding={groupBinding}
                rowIndex={row.index}
              >
                <GenericComponentById id={makeLikertChildId(node.id, row.index)} />
              </DataModelLocationProvider>
            ) : null,
          )}
        </div>
      </ComponentStructureWrapper>
    );
  }

  return (
    <ComponentStructureWrapper
      node={node}
      data-componentid={node.id}
      data-componentbaseid={node.baseId}
    >
      {isFetching ? (
        <AltinnSpinner />
      ) : (
        <Table
          id={id}
          border
          className={classes.likertTable}
          aria-describedby={textResourceBindings?.description ? getDescriptionId(id) : undefined}
        >
          {title && (
            <caption
              id={getLabelId(node.id)}
              className={classes.likertHeading}
            >
              <Heading
                level={2}
                data-size='sm'
              >
                <Lang id={title} />
              </Heading>
              <Description
                description={description && <Lang id={description} />}
                componentId={node.id}
              />
            </caption>
          )}
          <Table.Head id={`likert-table-header-${id}`}>
            <Table.Row>
              <Table.HeaderCell scope='col'>
                <span
                  className={cn({
                    'sr-only': textResourceBindings?.leftColumnHeader == null,
                  })}
                >
                  <Lang id={textResourceBindings?.leftColumnHeader ?? 'likert.left_column_default_header_text'} />
                </span>
              </Table.HeaderCell>
              {calculatedOptions.map((option, index) => {
                const divider = columns?.find((column) => column.value == option.value)?.divider;

                return (
                  <Table.HeaderCell
                    key={option.value}
                    scope='col'
                    id={`${id}-likert-columnheader-${index}`}
                    className={cn({
                      [classes.likertCellDividerStart]: divider === 'before',
                      [classes.likertCellDividerEnd]: divider === 'after',
                      [classes.likertCellDividerBoth]: divider === 'both',
                    })}
                  >
                    <Lang id={option.label} />
                  </Table.HeaderCell>
                );
              })}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((row) => {
              const override: IGenericComponentProps<'LikertItem'>['overrideItemProps'] = {
                layout: LayoutStyle.Table,
              };

              return row ? (
                <DataModelLocationProvider
                  key={row.index}
                  groupBinding={groupBinding}
                  rowIndex={row.index}
                >
                  <GenericComponentById
                    id={makeLikertChildId(node.id, row.index)}
                    overrideDisplay={{ directRender: true }}
                    overrideItemProps={override}
                  />
                </DataModelLocationProvider>
              ) : null;
            })}
          </Table.Body>
        </Table>
      )}
    </ComponentStructureWrapper>
  );
};
