import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { validateEmptyFieldAllBindings } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { CustomReactDef } from 'src/layout/CustomReact/config.def.generated';
import { CustomReactComponent, CustomReactRenderer } from 'src/layout/CustomReact/CustomReactComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useHasBindingsAndNoData } from 'src/layout/Summary2/isEmpty/isEmptyComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useItemWhenType, useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/utils';
import type { ComponentValidation } from 'src/features/validation';
import type {
  ComponentValidationContext,
  DataModelBindingValidationContext,
  PropsFromGenericComponent,
  ValidateEmptyField,
} from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

// Types that a CustomReact component can write to, see CustomReactFormValue
const validBindingTypes = ['string', 'number', 'integer', 'boolean', 'array'];

export class CustomReact extends CustomReactDef implements ValidateEmptyField<'CustomReact'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'CustomReact'>>(
    function LayoutComponentCustomReactRender(props, _): JSX.Element | null {
      return <CustomReactComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'CustomReact');
    return Object.values(formData ?? {}).join(', ');
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(props.targetBaseComponentId);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    const isEmpty = useHasBindingsAndNoData(props.targetBaseComponentId);
    const required = useItemWhenType(props.targetBaseComponentId, 'CustomReact').required;
    return (
      <SummaryFlex
        targetBaseId={props.targetBaseComponentId}
        content={
          isEmpty
            ? required
              ? SummaryContains.EmptyValueRequired
              : SummaryContains.EmptyValueNotRequired
            : SummaryContains.SomeUserContent
        }
      >
        <CustomReactRenderer
          baseComponentId={props.targetBaseComponentId}
          summaryMode={true}
        />
      </SummaryFlex>
    );
  }

  validateEmptyField(ctx: ComponentValidationContext<'CustomReact'>): ComponentValidation[] {
    return validateEmptyFieldAllBindings(ctx);
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'CustomReact'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    return Object.keys(bindings ?? {}).flatMap(
      (key) =>
        validateDataModelBindingsAny(
          baseComponentId,
          bindings,
          lookupBinding,
          layoutLookups,
          key,
          validBindingTypes,
          false,
        )[0] ?? [],
    );
  }
}
