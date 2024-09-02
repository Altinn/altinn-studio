import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleSelectDef } from 'src/layout/MultipleSelect/config.def.generated';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { MultipleSelectSummary } from 'src/layout/MultipleSelect/MultipleSelectSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class MultipleSelect extends MultipleSelectDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'MultipleSelect'>>(
    function LayoutComponentMultipleSelectRender(props, _): JSX.Element | null {
      return <MultipleSelectComponent {...props} />;
    },
  );

  private getSummaryData(
    node: LayoutNode<'MultipleSelect'>,
    { nodeFormDataSelector, optionsSelector, langTools }: DisplayDataProps,
  ): { [key: string]: string } {
    const data = nodeFormDataSelector(node);
    if (!data.simpleBinding) {
      return {};
    }

    const value = String(data.simpleBinding ?? '');
    const { options } = optionsSelector(node);
    return getCommaSeparatedOptionsToText(value, options, langTools);
  }

  getDisplayData(node: LayoutNode<'MultipleSelect'>, props: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, props)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'MultipleSelect'>): JSX.Element | null {
    return <MultipleChoiceSummary getFormData={(props) => this.getSummaryData(targetNode, props)} />;
  }

  renderSummary2(props: Summary2Props<'MultipleSelect'>): JSX.Element | null {
    const displayData = this.useDisplayData(props.target);
    const ourOverride = props.overrides?.find((override) => override.componentId === props.target.id);
    console.log(JSON.stringify(ourOverride, null, 2));
    return (
      <MultipleSelectSummary
        componentNode={props.target}
        summaryOverrides={props.overrides}
        displayData={displayData}
        emptyFieldText={ourOverride?.emptyFieldText}
      />
    );
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'MultipleSelect'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
