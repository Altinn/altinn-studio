import React from 'react';
import type { PropsWithChildren } from 'react';

import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/components/label/Label.module.css';
import { LabelContent } from 'src/components/label/LabelContent';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { LabelContentProps } from 'src/components/label/LabelContent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGridStyling, TRBLabel } from 'src/layout/common.generated';
import type { CompInternal } from 'src/layout/layout';

type LabelType = 'span' | 'plainLabel';

export type LabelProps = PropsWithChildren<{
  baseComponentId: string;
  renderLabelAs: LabelType;
  className?: string;
  overrideId?: string;
  textResourceBindings?: ExprResolved<TRBLabel>;
}> &
  DesignsystemetLabelProps;

type LabelInnerProps = LabelProps & { item: CompInternal };

export function Label(props: LabelProps) {
  const item = useItemFor(props.baseComponentId);
  return (
    <LabelInner
      item={item}
      {...props}
    />
  );
}

export function LabelInner(props: LabelInnerProps) {
  const { children } = props;
  const {
    item: _item,
    overrideId,
    renderLabelAs,
    className,
    textResourceBindings: overriddenTrb,
    ...designsystemetLabelProps
  } = props;

  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const item = { ..._item, ...overrideItemProps };
  const { grid, textResourceBindings: _trb } = item;
  const required = 'required' in item && item.required;
  const readOnly = 'readOnly' in item && item.readOnly;
  const labelSettings = 'labelSettings' in item ? item.labelSettings : undefined;

  const id = useIndexedId(overrideId ?? props.baseComponentId);
  const textResourceBindings = (overriddenTrb ?? _trb) as ExprResolved<TRBLabel> | undefined;

  if (!textResourceBindings?.title) {
    return children;
  }

  const labelId = getLabelId(id);
  const labelContentProps: LabelContentProps = {
    componentId: id,
    label: textResourceBindings.title,
    description: textResourceBindings.description,
    help: textResourceBindings.help,
    required,
    readOnly,
    labelSettings,
  };

  switch (renderLabelAs) {
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
                componentId={id}
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
    <Flex
      item
      size={labelGrid ?? { xs: 12 }}
    >
      {children}
    </Flex>
  );
}

export function getLabelId(nodeId: string) {
  return `label-${nodeId}`;
}

export function getDescriptionId(nodeId?: string) {
  if (!nodeId) {
    return undefined;
  }

  return `description-${getLabelId(nodeId)}`;
}
