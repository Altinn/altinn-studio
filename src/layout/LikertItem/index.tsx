import React from 'react';
import type { JSX } from 'react';

import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { LayoutStyle } from 'src/layout/common.generated';
import { LikertItemDef } from 'src/layout/LikertItem/config.def.generated';
import { LikertItemComponent } from 'src/layout/LikertItem/LikertItemComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsLikertInternal } from 'src/layout/common.generated';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class LikertItem extends LikertItemDef {
  render(props: PropsFromGenericComponent<'LikertItem'>): JSX.Element | null {
    return <LikertItemComponent {...props} />;
  }

  directRender(props: PropsFromGenericComponent<'LikertItem'>): boolean {
    return props.node.item.layout === LayoutStyle.Table || props.overrideItemProps?.layout === LayoutStyle.Table;
  }

  getDisplayData(node: LayoutNode<'LikertItem'>, { langTools, options }: DisplayDataProps): string {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const value = String(node.getFormData().simpleBinding ?? '');
    const optionList = options[node.item.id] || [];
    return getSelectedValueToText(value, langTools, optionList) || '';
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

    const parentBindings = ctx.node.parent?.item.dataModelBindings as IDataModelBindingsLikertInternal | undefined;
    const bindings = ctx.node.item.dataModelBindings;
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
