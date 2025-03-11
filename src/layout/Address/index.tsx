import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressSummary } from 'src/layout/Address/AddressSummary/AddressSummary';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { useAddressValidation } from 'src/layout/Address/useAddressValidation';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends AddressDef implements ValidateComponent<'Address'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Address'>>(
    function LayoutComponentAddressRender(props, _): JSX.Element | null {
      return <AddressComponent {...props} />;
    },
  );

  getDisplayData({ formData }: DisplayDataProps<'Address'>): string {
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

  validateDataModelBindings(ctx: LayoutValidationCtx<'Address'>): string[] {
    const errors: string[] = [
      ...(this.validateDataModelBindingsAny(ctx, 'address', ['string'])[0] || []),
      ...(this.validateDataModelBindingsAny(ctx, 'zipCode', ['string', 'number', 'integer'])[0] || []),
      ...(this.validateDataModelBindingsAny(ctx, 'postPlace', ['string'])[0] || []),
    ];

    if (ctx.item.simplified === false) {
      errors.push(...(this.validateDataModelBindingsAny(ctx, 'careOf', ['string'])[0] || []));
      errors.push(...(this.validateDataModelBindingsAny(ctx, 'houseNumber', ['string', 'number', 'integer'])[0] || []));
    } else {
      const hasCareOf = ctx.item.dataModelBindings?.careOf;
      const hasHouseNumber = ctx.item.dataModelBindings?.houseNumber;
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
