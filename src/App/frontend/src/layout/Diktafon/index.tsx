import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { DiktafonComponent } from 'src/layout/Diktafon/DiktafonComponent';
import { DiktafonDef } from 'src/layout/Diktafon/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsSimple } from 'src/utils/layout/validation/utils';
import type { DataModelBindingValidationContext, PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Diktafon extends DiktafonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Diktafon'>>(
    function LayoutComponentDiktafonRender(props, _): JSX.Element | null {
      return <DiktafonComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Diktafon');
    return formData?.simpleBinding ?? '';
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(props.targetBaseComponentId);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        multiline
      />
    );
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Diktafon'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    return validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
  }
}
