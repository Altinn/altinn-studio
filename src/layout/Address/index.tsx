import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressSummary } from 'src/layout/Address/AddressSummary/AddressSummary';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
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

  getDisplayData(node: LayoutNode<'Address'>, { nodeFormDataSelector }: DisplayDataProps): string {
    const data = nodeFormDataSelector(node);
    return Object.values(data).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Address'>): JSX.Element | null {
    const data = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }

  renderSummary2(props: Summary2Props<'Address'>): JSX.Element | null {
    return <AddressSummary componentNode={props.target} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  runComponentValidation(
    node: LayoutNode<'Address'>,
    { formDataSelector, nodeDataSelector }: ValidationDataSources,
  ): ComponentValidation[] {
    const dataModelBindings = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
    if (!dataModelBindings) {
      return [];
    }
    const validations: ComponentValidation[] = [];

    const zipCodeField = dataModelBindings.zipCode;
    const zipCode = zipCodeField ? formDataSelector(zipCodeField) : undefined;
    const zipCodeAsString = typeof zipCode === 'string' || typeof zipCode === 'number' ? String(zipCode) : undefined;

    // TODO(Validation): Add better message for the special case of 0000 or add better validation for zipCodes that the API says are invalid
    if (zipCodeAsString && (!zipCodeAsString.match(/^\d{4}$/) || zipCodeAsString === '0000')) {
      validations.push({
        message: { key: 'address_component.validation_error_zipcode' },
        severity: 'error',
        bindingKey: 'zipCode',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    const houseNumberField = dataModelBindings.houseNumber;
    const houseNumber = houseNumberField ? formDataSelector(houseNumberField) : undefined;
    const houseNumberAsString =
      typeof houseNumber === 'string' || typeof houseNumber === 'number' ? String(houseNumber) : undefined;

    if (houseNumberAsString && !houseNumberAsString.match(/^[a-z,A-Z]\d{4}$/)) {
      validations.push({
        message: { key: 'address_component.validation_error_house_number' },
        severity: 'error',
        bindingKey: 'houseNumber',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    return validations;
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
