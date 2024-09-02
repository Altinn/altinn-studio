import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesSummary } from 'src/layout/Checkboxes/CheckboxesSummary';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends CheckboxesDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Checkboxes'>>(
    function LayoutComponentCheckboxesRender(props, _): JSX.Element | null {
      return <CheckboxContainerComponent {...props} />;
    },
  );

  private getSummaryData(
    node: LayoutNode<'Checkboxes'>,
    { nodeFormDataSelector, optionsSelector, langTools }: DisplayDataProps,
  ): { [key: string]: string } {
    const value = nodeFormDataSelector(node).simpleBinding ?? '';
    const { options } = optionsSelector(node);
    return getCommaSeparatedOptionsToText(value, options, langTools);
  }

  getDisplayData(node: LayoutNode<'Checkboxes'>, props: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, props)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    return <MultipleChoiceSummary getFormData={(props) => this.getSummaryData(targetNode, props)} />;
  }

  renderSummary2(props: Summary2Props<'Checkboxes'>): JSX.Element | null {
    const displayData = this.useDisplayData(props.target);
    const ourOverride = props.overrides?.find((override) => override.componentId === props.target.id);
    return (
      <CheckboxesSummary
        componentNode={props.target}
        displayData={displayData}
        summaryOverrides={props.overrides}
        isCompact={props.isCompact}
        emptyFieldText={ourOverride?.emptyFieldText}
      />
    );
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Checkboxes'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
