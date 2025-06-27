import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressSummary } from 'src/layout/Address/AddressSummary/AddressSummary';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { useAddressValidation } from 'src/layout/Address/useAddressValidation';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useValidateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends AddressDef implements ValidateComponent<'Address'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Address'>>(
    function LayoutComponentAddressRender(props, _): JSX.Element | null {
      return <AddressComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Address');
    return Object.values(formData ?? {}).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Address'>): JSX.Element | null {
    const data = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }

  renderSummary2(props: Summary2Props<'Address'>): JSX.Element | null {
    return <AddressSummary componentNode={props.target} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  useComponentValidation(node: LayoutNode<'Address'>): ComponentValidation[] {
    return useAddressValidation(node);
  }

  useDataModelBindingValidation(node: LayoutNode<'Address'>, bindings: IDataModelBindings<'Address'>): string[] {
    const component = useLayoutLookups().getComponent(node.baseId, 'Address');
    const errors: string[] = [
      ...(useValidateDataModelBindingsAny(node, bindings, 'address', ['string'])[0] || []),
      ...(useValidateDataModelBindingsAny(node, bindings, 'zipCode', ['string', 'number', 'integer'])[0] || []),
      ...(useValidateDataModelBindingsAny(node, bindings, 'postPlace', ['string'])[0] || []),
    ];

    if (component.simplified === false) {
      errors.push(...(useValidateDataModelBindingsAny(node, bindings, 'careOf', ['string'])[0] || []));
      errors.push(
        ...(useValidateDataModelBindingsAny(node, bindings, 'houseNumber', ['string', 'number', 'integer'])[0] || []),
      );
    } else {
      const hasCareOf = bindings?.careOf;
      const hasHouseNumber = bindings?.houseNumber;
      if (hasCareOf) {
        errors.push(`Datamodellbindingen 'careOf' støttes ikke for en forenklet adresse-komponent`);
      }
      if (hasHouseNumber) {
        errors.push(`Datamodellbindingen 'houseNumber' støttes ikke for en forenklet adresse-komponent`);
      }
    }

    return errors;
  }
}
