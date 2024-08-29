import React from 'react';
import type { PropsWithChildren } from 'react';

import { Fieldset, Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import classes from 'src/components/label/Label.module.css';
import { LabelContent } from 'src/components/label/LabelContent';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { gridBreakpoints } from 'src/utils/formComponentUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LabelContentProps } from 'src/components/label/LabelContent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGridStyling, TRBLabel } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type LabelType = 'legend' | 'span' | 'label' | 'plainLabel';

export type LabelProps = PropsWithChildren<{
  node: LayoutNode;
  renderLabelAs: LabelType;
  className?: string;

  overrideId?: string;
  textResourceBindings?: ExprResolved<TRBLabel>;
}> &
  DesignsystemetLabelProps;

export function Label(props: LabelProps) {
  const { children, ...propsWithoutChildren } = props;
  const {
    node,
    overrideId,
    renderLabelAs,
    className,
    textResourceBindings: overriddenTrb,
    ...designsystemetLabelProps
  } = props;

  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const _item = useNodeItem(node);
  const item = { ..._item, ...overrideItemProps };
  const { id: nodeId, grid, textResourceBindings: _trb } = item;
  const required = 'required' in item && item.required;
  const readOnly = 'readOnly' in item && item.readOnly;
  const labelSettings = 'labelSettings' in item ? item.labelSettings : undefined;

  // These can be overridden by props, but are otherwise retrieved from the node item
  const id = overrideId ?? nodeId;
  const textResourceBindings = (overriddenTrb ?? _trb) as ExprResolved<TRBLabel> | undefined;

  if (!textResourceBindings?.title) {
    return <>{children}</>;
  }

  const labelId = `label-${id}`;
  const labelContentProps: LabelContentProps = {
    labelId,
    label: textResourceBindings.title,
    description: textResourceBindings.description,
    help: textResourceBindings.help,
    required,
    readOnly,
    labelSettings,
  };

  switch (renderLabelAs) {
    case 'legend': {
      return (
        <Fieldset
          className={cn(classes.fieldWrapper, classes.fullWidth)}
          legend={
            <Label
              {...propsWithoutChildren}
              renderLabelAs='span'
              overrideId={id}
            />
          }
        >
          {children}
        </Fieldset>
      );
    }
    case 'label':
      return (
        <DesignsystemetLabel
          id={labelId}
          htmlFor={id}
          style={{ width: '100%' }}
          className={className}
          {...designsystemetLabelProps}
        >
          <Grid
            container
            spacing={2}
          >
            <LabelGridItemWrapper labelGrid={grid?.labelGrid}>
              <LabelContent {...labelContentProps} />
            </LabelGridItemWrapper>
            {children}
          </Grid>
        </DesignsystemetLabel>
      );
    case 'plainLabel':
      return (
        <DesignsystemetLabel
          id={labelId}
          htmlFor={id}
          className={className}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <LabelContent {...labelContentProps} />
          </div>
          {children}
        </DesignsystemetLabel>
      );

    case 'span':
    default:
      return (
        <span
          id={labelId}
          className={cn(classes.fieldWrapper, className)}
        >
          {/* we want this "label" not to be rendered as a <label>,
           because it does not belong to an input element */}
          <LabelGridItemWrapper labelGrid={grid?.labelGrid}>
            <DesignsystemetLabel
              asChild
              {...designsystemetLabelProps}
            >
              <LabelContent
                {...labelContentProps}
                labelId={labelId}
              />
            </DesignsystemetLabel>
          </LabelGridItemWrapper>
          {children}
        </span>
      );
  }
}

function LabelGridItemWrapper({ children, labelGrid }: PropsWithChildren<{ labelGrid?: IGridStyling }>) {
  return (
    <Grid
      item
      {...gridBreakpoints(labelGrid)}
    >
      {children}
    </Grid>
  );
}
