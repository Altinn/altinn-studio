import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import { Grid, Typography } from '@material-ui/core';
import cn from 'classnames';

import type { PropsFromGenericComponent } from '..';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { LayoutStyle } from 'src/layout/common.generated';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/LikertItem/LikertItemComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';

type LikertComponentProps = PropsFromGenericComponent<'Likert'>;

export const LikertComponent = ({ node }: LikertComponentProps) => {
  const { textResourceBindings, rows } = useNodeItem(node);
  const mobileView = useIsMobileOrTablet();
  const { options: calculatedOptions, isFetching } = useNodeOptions(rows.find((row) => !!row)?.itemNode);
  const { lang } = useLanguage();
  const rowNodes = rows.map((row) => row?.itemNode).filter(typedBoolean);

  const id = node.id;
  const hasDescription = !!textResourceBindings?.description;
  const hasTitle = !!textResourceBindings?.title;
  const titleId = `likert-title-${id}`;
  const descriptionId = `likert-description-${id}`;

  const Header = () => (
    <Grid
      item={true}
      xs={12}
      className={cn({ [classes.likertHeader]: hasTitle || hasDescription })}
    >
      {hasTitle && (
        <Typography
          component='div'
          variant='h3'
          style={{ width: '100%' }}
          id={titleId}
        >
          <Lang id={textResourceBindings?.title} />
        </Typography>
      )}
      {hasDescription && (
        <Typography
          variant='body1'
          id={descriptionId}
        >
          <Lang id={textResourceBindings?.description} />
        </Typography>
      )}
    </Grid>
  );

  if (mobileView) {
    return (
      <ComponentStructureWrapper node={node}>
        <Grid
          item
          container
          data-componentid={node.id}
          data-componentbaseid={node.baseId}
        >
          <Header />
          <div
            role='group'
            className={classes.likertMobileGroup}
            aria-labelledby={(hasTitle && titleId) || undefined}
            aria-describedby={(hasDescription && descriptionId) || undefined}
          >
            {rowNodes.map((comp) => (
              <GenericComponent
                key={comp.id}
                node={comp}
              />
            ))}
          </div>
        </Grid>
      </ComponentStructureWrapper>
    );
  }

  return (
    <ComponentStructureWrapper node={node}>
      <Grid
        item
        container
        data-componentid={node.id}
        data-componentbaseid={node.baseId}
      >
        <Header />
        {isFetching ? (
          <AltinnSpinner />
        ) : (
          <Table
            id={id}
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-describedby={hasDescription ? descriptionId : undefined}
            className={classes.likertTable}
          >
            <Table.Head
              id={`likert-table-header-${id}`}
              aria-hidden={true}
            >
              <Table.Row>
                <Table.HeaderCell id={`${id}-likert-columnheader-left`}>
                  <span
                    className={cn(classes.likertTableHeaderCell, {
                      'sr-only': textResourceBindings?.leftColumnHeader == null,
                    })}
                  >
                    <Lang id={textResourceBindings?.leftColumnHeader ?? 'likert.left_column_default_header_text'} />
                  </span>
                </Table.HeaderCell>
                {calculatedOptions.map((option, index) => {
                  const colLabelId = `${id}-likert-columnheader-${index}`;
                  return (
                    <Table.HeaderCell
                      key={option.value}
                      className={classes.likertTableHeaderCell}
                      id={colLabelId}
                    >
                      {lang(option.label)}
                    </Table.HeaderCell>
                  );
                })}
              </Table.Row>
            </Table.Head>
            <Table.Body id={`likert-table-body-${id}`}>
              {rowNodes.map((comp) => {
                const override: IGenericComponentProps<'LikertItem'>['overrideItemProps'] = {
                  layout: LayoutStyle.Table,
                };

                return (
                  <GenericComponent
                    key={comp.id}
                    node={comp}
                    overrideDisplay={{ directRender: true }}
                    overrideItemProps={override}
                  />
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Grid>
    </ComponentStructureWrapper>
  );
};
