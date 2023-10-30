import React from 'react';
import type { JSX } from 'react';

import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptions } from 'src/features/options/useAllOptions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { type IUseLanguage, useLanguage } from 'src/hooks/useLanguage';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { IFormData } from 'src/features/formData';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends CheckboxesDef {
  render(props: PropsFromGenericComponent<'Checkboxes'>): JSX.Element | null {
    return <CheckboxContainerComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNode<'Checkboxes'>,
    formData: IFormData,
    langTools: IUseLanguage,
    options: AllOptionsMap,
  ): { [key: string]: string } {
    const value = node.item.dataModelBindings?.simpleBinding
      ? formData[node.item.dataModelBindings.simpleBinding] || ''
      : '';
    const optionList = options[node.item.id] || [];
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNode<'Checkboxes'>, { formData, langTools, options }: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, formData, langTools, options)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    const formData = useAppSelector((state) => state.formData.formData);
    const langTools = useLanguage();
    const options = useAllOptions();
    const summaryData = this.getSummaryData(targetNode, formData, langTools, options);
    return <MultipleChoiceSummary formData={summaryData} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Checkboxes'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
