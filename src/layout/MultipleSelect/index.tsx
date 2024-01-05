import React from 'react';
import type { JSX } from 'react';

import { type IUseLanguage, useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptions } from 'src/features/options/useAllOptions';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleSelectDef } from 'src/layout/MultipleSelect/config.def.generated';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class MultipleSelect extends MultipleSelectDef {
  render(props: PropsFromGenericComponent<'MultipleSelect'>): JSX.Element | null {
    return <MultipleSelectComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNode<'MultipleSelect'>,
    langTools: IUseLanguage,
    options: AllOptionsMap,
  ): { [key: string]: string } {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return {};
    }

    const value = String(node.getFormData().simpleBinding ?? '');
    const optionList = options[node.item.id] || [];
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNode<'MultipleSelect'>, { langTools, options }: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, langTools, options)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'MultipleSelect'>): JSX.Element | null {
    const langTools = useLanguage();
    const options = useAllOptions();
    const summaryData = this.getSummaryData(targetNode, langTools, options);
    return <MultipleChoiceSummary formData={summaryData} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'MultipleSelect'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
