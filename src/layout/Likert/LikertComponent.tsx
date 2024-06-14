import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import { Grid, Typography } from '@material-ui/core';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { LayoutStyle } from 'src/layout/common.generated';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/LikertItem/LikertItemComponent.module.css';
import type { IGenericComponentProps } from 'src/layout/GenericComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface LikertComponentProps {
  node: LayoutNode<'Likert'>;
}

export const LikertComponent = ({ node }: LikertComponentProps) => {
  const firstLikertChild = node?.children((item) => item.type === 'LikertItem') as LayoutNode<'LikertItem'> | undefined;
  const mobileView = useIsMobileOrTablet();
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...(firstLikertChild?.item || {}),
    node,
    valueType: 'single',
    dataModelBindings: undefined,
  });
  const { lang } = useLanguage();

  const id = node.item.id;
  const hasDescription = !!node?.item.textResourceBindings?.description;
  const hasTitle = !!node?.item.textResourceBindings?.title;
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
          {lang(node?.item.textResourceBindings?.title)}
        </Typography>
      )}
      {hasDescription && (
        <Typography
          variant='body1'
          id={descriptionId}
        >
          {lang(node?.item.textResourceBindings?.description)}
        </Typography>
      )}
    </Grid>
  );

  if (mobileView) {
    return (
      <Grid
        item
        container
        data-componentid={node.item.id}
        data-componentbaseid={node.item.baseComponentId || node.item.id}
      >
        <Header />
        <div
          role='group'
          className={classes.likertMobileGroup}
          aria-labelledby={(hasTitle && titleId) || undefined}
          aria-describedby={(hasDescription && descriptionId) || undefined}
        >
          {node?.children().map((comp) => {
            if (comp.isType('Group') || comp.isType('Summary')) {
              window.logWarnOnce('Unexpected Group or Summary inside likert container:\n', comp.item.id);
              return;
            }

            return (
              <GenericComponent
                key={comp.item.id}
                node={comp}
              />
            );
          })}
        </div>
      </Grid>
    );
  }

  return (
    <Grid
      item
      container
      data-componentid={node.item.id}
      data-componentbaseid={node.item.baseComponentId || node.item.id}
    >
      <Header />
      {isFetching ? (
        <AltinnSpinner />
      ) : (
        <Table
          id={id}
          aria-labelledby={(hasTitle && titleId) || undefined}
          aria-describedby={(hasDescription && descriptionId) || undefined}
          className={classes.likertTable}
          role='group'
        >
          <Table.Head
            id={`likert-table-header-${id}`}
            aria-hidden={true}
          >
            <Table.Row>
              <Table.HeaderCell id={`${id}-likert-columnheader-left`}>
                <span
                  className={cn(classes.likertTableHeaderCell, {
                    'sr-only': node?.item.textResourceBindings?.leftColumnHeader == null,
                  })}
                >
                  <Lang
                    id={node?.item.textResourceBindings?.leftColumnHeader ?? 'likert.left_column_default_header_text'}
                  />
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
            {node?.children().map((comp) => {
              if (comp.isType('Group') || comp.isType('Summary')) {
                window.logWarnOnce('Unexpected Group or Summary inside likert container:\n', comp.item.id);
                return;
              }

              const override: IGenericComponentProps<'LikertItem'>['overrideItemProps'] = {
                layout: LayoutStyle.Table,
              };

              return (
                <GenericComponent
                  key={comp.item.id}
                  node={comp as LayoutNode<'LikertItem'>}
                  overrideItemProps={override}
                />
              );
            })}
          </Table.Body>
        </Table>
      )}
    </Grid>
  );
};
