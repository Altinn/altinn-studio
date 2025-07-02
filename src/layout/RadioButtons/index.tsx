import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { RadioButtonsDef } from 'src/layout/RadioButtons/config.def.generated';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { RadioButtonsSummary } from 'src/layout/RadioButtons/RadioButtonsSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { validateDataModelBindingsSimple } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class RadioButtons extends RadioButtonsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'RadioButtons'>>(
    function LayoutComponentRadioButtonsRender(props, _): JSX.Element | null {
      return <ControlledRadioGroup {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'RadioButtons');
    const value = String(formData?.simpleBinding ?? '');
    const options = useOptionsFor(baseComponentId, 'single').options;
    const langTools = useLanguage();
    return getSelectedValueToText(value, langTools, options) || '';
  }

  evalExpressions(props: ExprResolver<'RadioButtons'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnChange: props.evalBool(props.item.alertOnChange, false),
    };
  }

  renderSummary({ targetNode }: SummaryRendererProps<'RadioButtons'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'RadioButtons'>): JSX.Element | null {
    return <RadioButtonsSummary {...props} />;
  }

  useEmptyFieldValidation(baseComponentId: string): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(baseComponentId, 'simpleBinding');
  }

  useDataModelBindingValidation(baseComponentId: string, dmb: IDataModelBindings<'RadioButtons'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    return validateDataModelBindingsSimple(baseComponentId, dmb, lookupBinding, layoutLookups);
  }
}
