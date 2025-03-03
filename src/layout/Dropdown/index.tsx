import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { runEmptyFieldValidationOnlySimpleBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { DropdownDef } from 'src/layout/Dropdown/config.def.generated';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { DropdownSummary } from 'src/layout/Dropdown/DropdownSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

export class Dropdown extends DropdownDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Dropdown'>>(
    function LayoutComponentDropdownRender(props, _): JSX.Element | null {
      return <DropdownComponent {...props} />;
    },
  );

  getDisplayData({ langTools, optionsSelector, formData, nodeId }: DisplayDataProps<'Dropdown'>): string {
    const value = String(formData?.simpleBinding ?? '');
    if (!value) {
      return '';
    }

    const { options } = optionsSelector(nodeId);
    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Dropdown'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'Dropdown'>): JSX.Element | null {
    return (
      <DropdownSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  runEmptyFieldValidation(
    node: BaseLayoutNode<'Dropdown'>,
    validationDataSources: ValidationDataSources,
  ): ComponentValidation[] {
    return runEmptyFieldValidationOnlySimpleBinding(node, validationDataSources);
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Dropdown'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
