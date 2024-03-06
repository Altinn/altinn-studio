import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import dot from 'dot-object';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends AddressDef implements ValidateComponent {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Address'>>(
    function LayoutComponentAddressRender(props, _): JSX.Element | null {
      return <AddressComponent {...props} />;
    },
  );

  getDisplayData(node: LayoutNode<'Address'>, { formDataSelector }: DisplayDataProps): string {
    const data = node.getFormData(formDataSelector);
    return Object.values(data).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Address'>): JSX.Element | null {
    const data = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  runComponentValidation(node: LayoutNode<'Address'>, { formData }: ValidationDataSources): ComponentValidation[] {
    if (!node.item.dataModelBindings) {
      return [];
    }
    const validations: ComponentValidation[] = [];

    const zipCodeField = node.item.dataModelBindings.zipCode;
    const zipCode = zipCodeField ? dot.pick(zipCodeField, formData) : undefined;
    const zipCodeAsString = typeof zipCode === 'string' || typeof zipCode === 'number' ? String(zipCode) : undefined;

    // TODO(Validation): Add better message for the special case of 0000 or add better validation for zipCodes that the API says are invalid
    if (zipCodeAsString && (!zipCodeAsString.match(/^\d{4}$/) || zipCodeAsString === '0000')) {
      validations.push({
        message: { key: 'address_component.validation_error_zipcode' },
        severity: 'error',
        bindingKey: 'zipCode',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    const houseNumberField = node.item.dataModelBindings.houseNumber;
    const houseNumber = houseNumberField ? dot.pick(houseNumberField, formData) : undefined;
    const houseNumberAsString =
      typeof houseNumber === 'string' || typeof houseNumber === 'number' ? String(houseNumber) : undefined;

    if (houseNumberAsString && !houseNumberAsString.match(/^[a-z,A-Z]\d{4}$/)) {
      validations.push({
        message: { key: 'address_component.validation_error_house_number' },
        severity: 'error',
        bindingKey: 'houseNumber',
        componentId: node.item.id,
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
