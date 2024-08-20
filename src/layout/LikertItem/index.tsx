import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { LayoutStyle } from 'src/layout/common.generated';
import { LikertItemDef } from 'src/layout/LikertItem/config.def.generated';
import { LikertItemComponent } from 'src/layout/LikertItem/LikertItemComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class LikertItem extends LikertItemDef {
  render = forwardRef<HTMLTableRowElement, PropsFromGenericComponent<'LikertItem'>>(
    function LayoutComponentLikertItemRender(props, ref): JSX.Element | null {
      return (
        <LikertItemComponent
          {...props}
          ref={ref}
        />
      );
    },
  );

  directRender(item: CompInternal<'LikertItem'>): boolean {
    return item.layout === LayoutStyle.Table;
  }

  getDisplayData(
    node: LayoutNode<'LikertItem'>,
    { langTools, optionsSelector, nodeFormDataSelector }: DisplayDataProps,
  ): string {
    const value = String(nodeFormDataSelector(node).simpleBinding ?? '');
    if (!value) {
      return '';
    }

    const { options } = optionsSelector(node);
    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'LikertItem'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'LikertItem'>): string[] {
    const [answerErr, answer] = this.validateDataModelBindingsAny(ctx, 'simpleBinding', [
      'string',
      'number',
      'boolean',
    ]);
    const errors: string[] = [...(answerErr || [])];

    const parentBindings = ctx.nodeDataSelector(
      (picker) => picker(ctx.node.parent as LayoutNode<'Likert'>)?.layout?.dataModelBindings,
      [ctx.node.parent],
    );
    const bindings = ctx.item.dataModelBindings;
    if (
      answer &&
      bindings &&
      bindings.simpleBinding &&
      parentBindings &&
      parentBindings.questions &&
      bindings.simpleBinding.startsWith(`${parentBindings.questions}.`)
    ) {
      errors.push(`answer-datamodellbindingen må peke på en egenskap inne i questions-datamodellbindingen`);
    }

    return errors;
  }
}
