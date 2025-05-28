import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { LikertItemDef } from 'src/layout/LikertItem/config.def.generated';
import { LikertItemComponent } from 'src/layout/LikertItem/LikertItemComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

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

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'LikertItem');
    const options = useNodeOptions(nodeId).options;
    const langTools = useLanguage();
    const value = String(formData?.simpleBinding ?? '');
    if (!value) {
      return '';
    }

    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'LikertItem'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'LikertItem'>): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(node, 'simpleBinding');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'LikertItem'>): string[] {
    const [answerErr] = this.validateDataModelBindingsAny(ctx, 'simpleBinding', ['string', 'number', 'boolean']);
    const errors: string[] = [...(answerErr ?? [])];

    if (!(ctx.node.parent instanceof LayoutNode) || !ctx.node.parent.isType('Likert')) {
      throw new Error('LikertItem must have a parent of type "Likert"');
    }
    const parentId = ctx.node.parent.id;
    const parentBindings = ctx.nodeDataSelector(
      (picker) => picker(parentId, 'Likert')?.layout?.dataModelBindings,
      [parentId],
    );
    const bindings = ctx.item.dataModelBindings;

    if (parentBindings?.questions.dataType && bindings.simpleBinding.dataType !== parentBindings.questions.dataType) {
      errors.push('answer-datamodellbindingen må peke på samme datatype som questions-datamodellbindingen');
    }

    if (parentBindings?.questions && !bindings.simpleBinding.field.startsWith(`${parentBindings.questions.field}[`)) {
      errors.push(`answer-datamodellbindingen må peke på en egenskap inne i questions-datamodellbindingen`);
    }

    return errors;
  }
}
