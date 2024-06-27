import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { TextAreaDef } from 'src/layout/TextArea/config.def.generated';
import { TextAreaComponent } from 'src/layout/TextArea/TextAreaComponent';
import { TextAreaSummary } from 'src/layout/TextArea/TextAreaSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { CompTextAreaInternal } from 'src/layout/TextArea/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class TextArea extends TextAreaDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'TextArea'>>(
    function LayoutComponentTextAreaRender(props, _): JSX.Element | null {
      return <TextAreaComponent {...props} />;
    },
  );

  getDisplayData(node: LayoutNode<'TextArea'>, { formDataSelector }: DisplayDataProps): string {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    return node.getFormData(formDataSelector).simpleBinding ?? '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'TextArea'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(
    componentNode: LayoutNode<'TextArea'>,
    summaryOverrides?: CompTextAreaInternal['summaryProps'],
  ): JSX.Element | null {
    return (
      <TextAreaSummary
        componentNode={componentNode}
        summaryOverrides={summaryOverrides}
        displayData={this.useDisplayData(componentNode)}
      />
    );
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'TextArea'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
