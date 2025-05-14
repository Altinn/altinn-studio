import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useEmptyFieldValidationOnlySimpleBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { RadioButtonsDef } from 'src/layout/RadioButtons/config.def.generated';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { RadioButtonsSummary } from 'src/layout/RadioButtons/RadioButtonsSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class RadioButtons extends RadioButtonsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'RadioButtons'>>(
    function LayoutComponentRadioButtonsRender(props, _): JSX.Element | null {
      return <ControlledRadioGroup {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'RadioButtons');
    const value = String(formData?.simpleBinding ?? '');
    const options = useNodeOptions(nodeId).options;
    const langTools = useLanguage();
    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'RadioButtons'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'RadioButtons'>): JSX.Element | null {
    return <RadioButtonsSummary {...props} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'RadioButtons'>): ComponentValidation[] {
    return useEmptyFieldValidationOnlySimpleBinding(node);
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'RadioButtons'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
