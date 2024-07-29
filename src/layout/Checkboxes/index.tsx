import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptionsSelector } from 'src/features/options/useAllOptions';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { FormDataSelector, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { CheckboxSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends CheckboxesDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Checkboxes'>>(
    function LayoutComponentCheckboxesRender(props, _): JSX.Element | null {
      return <CheckboxContainerComponent {...props} />;
    },
  );

  private getSummaryData(
    node: LayoutNode<'Checkboxes'>,
    langTools: IUseLanguage,
    optionsSelector: ReturnType<typeof useAllOptionsSelector>,
    formDataSelector: FormDataSelector,
  ): { [key: string]: string } {
    const value = node.getFormData(formDataSelector).simpleBinding ?? '';
    const optionList = optionsSelector(node.item.id);
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(
    node: LayoutNode<'Checkboxes'>,
    { langTools, optionsSelector, formDataSelector }: DisplayDataProps,
  ): string {
    return Object.values(this.getSummaryData(node, langTools, optionsSelector, formDataSelector)).join(', ');
  }

  renderSummary({ targetNode, formDataSelector }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    const langTools = useLanguage();
    const options = useAllOptionsSelector();
    const summaryData = this.getSummaryData(targetNode, langTools, options, formDataSelector);
    return <MultipleChoiceSummary formData={summaryData} />;
  }

  renderSummary2(
    componentNode: LayoutNode<'Checkboxes'>,
    summaryOverrides?: CheckboxSummaryOverrideProps,
    isCompact?: boolean,
  ): JSX.Element | null {
    const displayData = this.useDisplayData(componentNode);
    const maxStringLength = 75;
    const showAsList =
      summaryOverrides?.displayType === 'list' ||
      (!summaryOverrides?.displayType && displayData?.length >= maxStringLength);
    const title = componentNode.item.textResourceBindings?.title;
    return (
      <MultipleValueSummary
        title={<Lang id={title} />}
        componentNode={componentNode}
        showAsList={showAsList}
        isCompact={isCompact}
      />
    );
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Checkboxes'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
