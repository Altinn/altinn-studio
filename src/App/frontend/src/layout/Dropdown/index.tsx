import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { validateEmptyFieldOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { DropdownDef } from 'src/layout/Dropdown/config.def.generated';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { DropdownSummary } from 'src/layout/Dropdown/DropdownSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsSimple } from 'src/utils/layout/validation/hooks';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext, PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Dropdown extends DropdownDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Dropdown'>>(
    function LayoutComponentDropdownRender(props, _): JSX.Element | null {
      return <DropdownComponent {...props} />;
    },
  );

  getOptionsEffectValueType() {
    return 'single' as const;
  }

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Dropdown');
    const options = useOptionsFor(baseComponentId, 'single').options;
    const langTools = useLanguage();
    const value = String(formData?.simpleBinding ?? '');
    if (!value) {
      return '';
    }

    return getSelectedValueToText(value, langTools, options) || '';
  }

  evalExpressions(props: ExprResolver<'Dropdown'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnChange: props.evalBool(props.item.alertOnChange, false),
    };
  }

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(targetBaseComponentId);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <DropdownSummary {...props} />;
  }

  validateEmptyField(ctx: ComponentValidationContext<'Dropdown'>): ComponentValidation[] {
    return validateEmptyFieldOnlyOneBinding(ctx, 'simpleBinding');
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'Dropdown'>): string[] {
    const lookupBinding = FormStore.bootstrap.useLookupBinding();
    const layoutLookups = FormStore.bootstrap.useLayoutLookups();
    return validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
  }
}
