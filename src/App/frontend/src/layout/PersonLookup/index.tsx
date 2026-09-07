import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { validateEmptyFieldOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { PersonLookupDef } from 'src/layout/PersonLookup/config.def.generated';
import { PersonLookupComponent } from 'src/layout/PersonLookup/PersonLookupComponent';
import { PersonLookupSummary } from 'src/layout/PersonLookup/PersonLookupSummary';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/utils';
import type { ComponentValidation } from 'src/features/validation';
import type {
  ComponentValidationContext,
  DataModelBindingValidationContext,
  PropsFromGenericComponent,
} from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class PersonLookup extends PersonLookupDef {
  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'PersonLookup');
    if (!formData) {
      return '';
    }
    const parts: string[] = [];

    if (formData.ssn) {
      parts.push(formData.ssn);
    }

    // Build full name from individual parts or use the Name binding
    if (formData.fullName) {
      parts.push(formData.fullName);
    } else {
      const nameParts: string[] = [];
      if (formData.firstName) {
        nameParts.push(formData.firstName);
      }
      if (formData.middleName) {
        nameParts.push(formData.middleName);
      }
      if (formData.lastName) {
        nameParts.push(formData.lastName);
      }

      if (nameParts.length > 0) {
        parts.push(nameParts.join(' '));
      }
    }

    return parts.join(', ');
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PersonLookup'>>(
    function LayoutComponentPersonLookupRender(props, _): JSX.Element | null {
      return <PersonLookupComponent {...props} />;
    },
  );

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    return null;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <PersonLookupSummary {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  validateEmptyField(ctx: ComponentValidationContext<'PersonLookup'>): ComponentValidation[] {
    return validateEmptyFieldOnlyOneBinding(ctx, 'ssn');
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'PersonLookup'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    return (
      validateDataModelBindingsAny(baseComponentId, bindings, lookupBinding, layoutLookups, 'ssn', ['string'])[0] ?? []
    );
  }
}
