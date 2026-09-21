import React from 'react';

import { Description, getDescriptionId, getLabelId, HelpTextContainer, useIsMobileOrTablet } from '@app/form-component';
import { LayoutStyle } from '@app/layout-contract/generated/common.generated';
import { Heading, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import type { PropsFromGenericComponent } from '..';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Likert/LikertComponent.module.css';
import { makeLikertChildId } from 'src/layout/Likert/makeLikertChildId';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import { DataModelLocationProvider, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';

interface LikertTitleProps {
  title: string;
  description?: string;
  help?: string;
  componentId: string;
  labelId: string;
}

function LikertTitle({ title, description, help, componentId, labelId }: LikertTitleProps) {
  return (
    <>
      <div className={classes.likertTitleAndHelp}>
        <Heading
          id={labelId}
          level={2}
          data-size='sm'
        >
          <Lang id={title} />
        </Heading>
        {help && (
          <HelpTextContainer
            id={componentId}
            title={title}
            helpText={<Lang id={help} />}
          />
        )}
      </div>
      <Description
        description={description && <Lang id={description} />}
        componentId={componentId}
      />
    </>
  );
}

export const LikertComponent = ({ baseComponentId }: PropsFromGenericComponent<'Likert'>) => {
  const { id, dataModelBindings, textResourceBindings, columns } = useItemWhenType(baseComponentId, 'Likert');
  const groupBinding = dataModelBindings.questions;
  const mobileView = useIsMobileOrTablet();
  const rows = useLikertRows(baseComponentId);
  const { options: calculatedOptions, isFetching } = useOptionsFor(makeLikertChildId(baseComponentId), 'single');

  const indexedId = useIndexedId(baseComponentId);
  const title = textResourceBindings?.title;
  const description = textResourceBindings?.description;
  const help = textResourceBindings?.help;
  const labelId = getLabelId(indexedId);

  if (mobileView) {
    return (
      <ComponentStructureWrapper
        baseComponentId={baseComponentId}
        data-componentid={indexedId}
        data-componentbaseid={baseComponentId}
      >
        {title && (
          <div className={classes.likertHeading}>
            <LikertTitle
              title={title}
              description={description}
              help={help}
              componentId={indexedId}
              labelId={labelId}
            />
          </div>
        )}
        <div
          role='group'
          className={classes.likertMobileGroup}
          aria-labelledby={textResourceBindings?.title ? labelId : undefined}
          aria-describedby={textResourceBindings?.description ? getDescriptionId(indexedId) : undefined}
        >
          {rows.map((row) =>
            row ? (
              <DataModelLocationProvider
                key={row.index}
                groupBinding={groupBinding}
                rowIndex={row.index}
              >
                <GenericComponent baseComponentId={makeLikertChildId(baseComponentId)} />
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
          aria-labelledby={title ? labelId : undefined}
          aria-describedby={textResourceBindings?.description ? getDescriptionId(indexedId) : undefined}
        >
          {title && (
            <caption className={classes.likertHeading}>
              <LikertTitle
                title={title}
                description={description}
                help={help}
                componentId={indexedId}
                labelId={labelId}
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
                  <GenericComponent
                    baseComponentId={makeLikertChildId(baseComponentId)}
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
