import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { DropdownDef } from 'src/layout/Dropdown/config.def.generated';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { DropdownSummary } from 'src/layout/Dropdown/DropdownSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useValidateDataModelBindingsSimple } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Dropdown extends DropdownDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Dropdown'>>(
    function LayoutComponentDropdownRender(props, _): JSX.Element | null {
      return <DropdownComponent {...props} />;
    },
  );

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

  renderSummary({ targetNode }: SummaryRendererProps<'Dropdown'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'Dropdown'>): JSX.Element | null {
    return <DropdownSummary {...props} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'Dropdown'>): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(node, 'simpleBinding');
  }

  useDataModelBindingValidation(node: LayoutNode<'Dropdown'>, bindings: IDataModelBindings<'Dropdown'>): string[] {
    return useValidateDataModelBindingsSimple(node, bindings);
  }
}
