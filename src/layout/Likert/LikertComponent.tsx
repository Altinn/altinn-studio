import React from 'react';

import { Heading, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import type { PropsFromGenericComponent } from '..';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Description } from 'src/components/form/Description';
import { getDescriptionId, getLabelId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { LayoutStyle } from 'src/layout/common.generated';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponentByBaseId } from 'src/layout/GenericComponent';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import classes from 'src/layout/Likert/LikertComponent.module.css';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import { DataModelLocationProvider, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';

export const LikertComponent = ({ baseComponentId }: PropsFromGenericComponent<'Likert'>) => {
  const { id, dataModelBindings, textResourceBindings, columns } = useItemWhenType(baseComponentId, 'Likert');
  const groupBinding = dataModelBindings.questions;
  const mobileView = useIsMobileOrTablet();
  const rows = useLikertRows(baseComponentId);
  const { options: calculatedOptions, isFetching } = useOptionsFor(makeLikertChildId(baseComponentId), 'single');

  const indexedId = useIndexedId(baseComponentId);
  const title = textResourceBindings?.title;
  const description = textResourceBindings?.description;

  if (mobileView) {
    return (
      <ComponentStructureWrapper
        baseComponentId={baseComponentId}
        data-componentid={indexedId}
        data-componentbaseid={baseComponentId}
      >
        {title && (
          <div
            className={classes.likertHeading}
            id={getLabelId(indexedId)}
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
                componentId={indexedId}
              />
            )}
          </div>
        )}
        <div
          role='group'
          className={classes.likertMobileGroup}
          aria-labelledby={textResourceBindings?.title ? getLabelId(indexedId) : undefined}
          aria-describedby={textResourceBindings?.description ? getDescriptionId(indexedId) : undefined}
        >
          {rows.map((row) =>
            row ? (
              <DataModelLocationProvider
                key={row.index}
                groupBinding={groupBinding}
                rowIndex={row.index}
              >
                <GenericComponentByBaseId id={makeLikertChildId(baseComponentId)} />
              </DataModelLocationProvider>
            ) : null,
          )}
        </div>
      </ComponentStructureWrapper>
    );
  }

  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      data-componentid={indexedId}
      data-componentbaseid={baseComponentId}
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
              id={getLabelId(indexedId)}
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
                componentId={indexedId}
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
                  <GenericComponentByBaseId
                    id={makeLikertChildId(baseComponentId)}
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
