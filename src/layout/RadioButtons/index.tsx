import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { RadioButtonsDef } from 'src/layout/RadioButtons/config.def.generated';
import { RadioButtonContainerComponent } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';
import { RadioButtonsSummary } from 'src/layout/RadioButtons/RadioButtonsSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { RadioSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class RadioButtons extends RadioButtonsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'RadioButtons'>>(
    function LayoutComponentRadioButtonsRender(props, _): JSX.Element | null {
      return <RadioButtonContainerComponent {...props} />;
    },
  );

  getDisplayData(
    node: LayoutNode<'RadioButtons'>,
    { langTools, optionsSelector, formDataSelector }: DisplayDataProps,
  ): string {
    const value = String(node.getFormData(formDataSelector).simpleBinding ?? '');
    const optionList = optionsSelector(node.item.id);
    return getSelectedValueToText(value, langTools, optionList) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'RadioButtons'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(
    componentNode: LayoutNode<'RadioButtons'>,
    summaryOverrides?: RadioSummaryOverrideProps,
    isCompact?: boolean,
  ): JSX.Element | null {
    const displayData = this.useDisplayData(componentNode);
    return (
      <RadioButtonsSummary
        componentNode={componentNode}
        summaryOverrides={summaryOverrides}
        displayData={displayData}
        isCompact={isCompact}
      />
    );
  }
  validateDataModelBindings(ctx: LayoutValidationCtx<'RadioButtons'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
