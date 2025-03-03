import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { runEmptyFieldValidationOnlySimpleBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { RadioButtonsDef } from 'src/layout/RadioButtons/config.def.generated';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { RadioButtonsSummary } from 'src/layout/RadioButtons/RadioButtonsSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

export class RadioButtons extends RadioButtonsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'RadioButtons'>>(
    function LayoutComponentRadioButtonsRender(props, _): JSX.Element | null {
      return <ControlledRadioGroup {...props} />;
    },
  );

  getDisplayData({ langTools, optionsSelector, formData, nodeId }: DisplayDataProps<'RadioButtons'>): string {
    const value = String(formData?.simpleBinding ?? '');
    const { options } = optionsSelector(nodeId);
    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'RadioButtons'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'RadioButtons'>): JSX.Element | null {
    return (
      <RadioButtonsSummary
        componentNode={props.target}
        emptyFieldText={props.override?.emptyFieldText}
        isCompact={props.isCompact}
      />
    );
  }

  runEmptyFieldValidation(
    node: BaseLayoutNode<'RadioButtons'>,
    validationDataSources: ValidationDataSources,
  ): ComponentValidation[] {
    return runEmptyFieldValidationOnlySimpleBinding(node, validationDataSources);
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'RadioButtons'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
