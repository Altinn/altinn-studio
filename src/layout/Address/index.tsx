import React from 'react';
import type { JSX } from 'react';

import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends AddressDef {
  render(props: PropsFromGenericComponent<'AddressComponent'>): JSX.Element | null {
    return <AddressComponent {...props} />;
  }

  getDisplayData(node: LayoutNode<'AddressComponent'>): string {
    const data = node.getFormData();
    return Object.values(data).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'AddressComponent'>): JSX.Element | null {
    const data = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'AddressComponent'>): string[] {
    const errors: string[] = [
      ...(this.validateDataModelBindingsAny(ctx, 'address', ['string'])[0] || []),
      ...(this.validateDataModelBindingsAny(ctx, 'zipCode', ['string', 'number', 'integer'])[0] || []),
      ...(this.validateDataModelBindingsAny(ctx, 'postPlace', ['string'])[0] || []),
    ];

    if (ctx.node.item.simplified === false) {
      errors.push(...(this.validateDataModelBindingsAny(ctx, 'careOf', ['string'])[0] || []));
      errors.push(...(this.validateDataModelBindingsAny(ctx, 'houseNumber', ['string', 'number', 'integer'])[0] || []));
    } else {
      const hasCareOf = ctx.node.item.dataModelBindings?.careOf;
      const hasHouseNumber = ctx.node.item.dataModelBindings?.houseNumber;
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
