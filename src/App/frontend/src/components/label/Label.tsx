import React from 'react';
import type { PropsWithChildren } from 'react';

import { Flex, getLabelId } from '@app/form-component';
import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling, TRBLabel } from '@app/layout-contract/generated/common.generated';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import classes from 'src/components/label/Label.module.css';
import { LabelContent } from 'src/components/label/LabelContent';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
import type { LabelContentProps } from 'src/components/label/LabelContent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { CompExternal, ITextResourceBindingsExternal } from 'src/layout/layout';

type LabelType = 'span' | 'plainLabel';

export type LabelProps = PropsWithChildren<{
  baseComponentId: string;
  renderLabelAs: LabelType;
  className?: string;
  overrideId?: string;
  textResourceBindings?: ExprResolved<TRBLabel>;
}> &
  DesignsystemetLabelProps;

type LabelInnerProps = LabelProps & { config: CompExternal };

export function Label(props: LabelProps) {
  const config = useComponentConfig(props.baseComponentId);
  return (
    <LabelInner
      config={config}
      {...props}
    />
  );
}

export function LabelInner(props: LabelInnerProps) {
  const { children } = props;
  const {
    config,
    overrideId,
    renderLabelAs,
    className,
    textResourceBindings: overriddenTrb,
    ...designsystemetLabelProps
  } = props;

  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const required = useEvalExpression(
    overrideItemProps && 'required' in overrideItemProps
      ? overrideItemProps.required
      : 'required' in config
        ? config.required
        : undefined,
    CommonExpressions.FormComponentProps.required,
  );
  const readOnly = useEvalExpression(
    overrideItemProps && 'readOnly' in overrideItemProps
      ? overrideItemProps.readOnly
      : 'readOnly' in config
        ? config.readOnly
        : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const labelSettings =
    overrideItemProps && 'labelSettings' in overrideItemProps
      ? overrideItemProps.labelSettings
      : 'labelSettings' in config
        ? config.labelSettings
        : undefined;

  const id = useIndexedId(overrideId ?? props.baseComponentId);
  const trb = (overriddenTrb ?? overrideItemProps?.textResourceBindings ?? config.textResourceBindings) as
    ITextResourceBindingsExternal | ExprResolved<TRBLabel>;
  const textConfig = { textResourceBindings: trb };
  const title = useEvalOptionalTrb(textConfig, 'title', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(textConfig, 'help', CommonExpressions.TRBLabel);
  const description = useEvalOptionalTrb(textConfig, 'description', CommonExpressions.TRBLabel);

  if (!title) {
    return children;
  }

  const labelId = getLabelId(id);
  const labelContentProps: LabelContentProps = {
    id,
    label: title,
    description,
    help,
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
          <LabelGridItemWrapper labelGrid={(overrideItemProps?.grid ?? config.grid)?.labelGrid}>
            <DesignsystemetLabel
              asChild
              {...designsystemetLabelProps}
            >
              <LabelContent
                {...labelContentProps}
                id={id}
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
