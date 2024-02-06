import React from 'react';

import {
  LegacyTable,
  LegacyTableBody,
  LegacyTableCell,
  LegacyTableHeader,
  LegacyTableRow,
} from '@digdir/design-system-react';
import { Grid, Typography } from '@material-ui/core';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
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
  ref?: React.Ref<HTMLDivElement>;
}

export const LikertComponent = ({ node, ref }: LikertComponentProps) => {
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
      data-componentid={node?.item.id}
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
          gutterBottom
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
      >
        <Header />
        <div
          role='group'
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
    <>
      <Header />
      {isFetching ? (
        <AltinnSpinner />
      ) : (
        <div
          className={classes.likertTableContainer}
          ref={ref}
        >
          <LegacyTable
            id={id}
            aria-labelledby={(hasTitle && titleId) || undefined}
            aria-describedby={(hasDescription && descriptionId) || undefined}
          >
            <LegacyTableHeader id={`likert-table-header-${id}`}>
              <LegacyTableRow>
                {node?.item.textResourceBindings?.leftColumnHeader ? (
                  <LegacyTableCell>{lang(node?.item.textResourceBindings?.leftColumnHeader)}</LegacyTableCell>
                ) : (
                  <LegacyTableCell />
                )}
                {calculatedOptions.map((option, index) => {
                  const colLabelId = `${id}-likert-columnheader-${index}`;
                  return (
                    <LegacyTableCell
                      key={option.value}
                      id={colLabelId}
                      className={classes.likertTableHeaderTop}
                    >
                      {lang(option.label)}
                    </LegacyTableCell>
                  );
                })}
              </LegacyTableRow>
            </LegacyTableHeader>
            <LegacyTableBody id={`likert-table-body-${id}`}>
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
            </LegacyTableBody>
          </LegacyTable>
        </div>
      )}
    </>
  );
};
