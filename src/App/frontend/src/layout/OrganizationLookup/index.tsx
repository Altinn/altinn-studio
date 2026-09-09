import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { ComponentValidationContext, PropsFromGenericComponent } from '..';

import { validateEmptyFieldOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { OrganizationLookupDef } from 'src/layout/OrganizationLookup/config.def.generated';
import { OrganizationLookupComponent } from 'src/layout/OrganizationLookup/OrganizationLookupComponent';
import { OrganizationLookupSummary } from 'src/layout/OrganizationLookup/OrganizationLookupSummary';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/utils';
import type { ComponentValidation } from 'src/features/validation';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class OrganizationLookup extends OrganizationLookupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'OrganizationLookup'>>(
    function LayoutComponentOrganizationLookupRender(props, _): JSX.Element | null {
      return <OrganizationLookupComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'OrganizationLookup');
    return Object.values(formData ?? {}).join(', ');
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <OrganizationLookupSummary {...props} />;
  }

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    return null;
  }

  validateEmptyField(ctx: ComponentValidationContext<'OrganizationLookup'>): ComponentValidation[] {
    return validateEmptyFieldOnlyOneBinding(ctx, 'orgnr', 'organization_lookup.error_required');
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'OrganizationLookup'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    return (
      validateDataModelBindingsAny(baseComponentId, bindings, lookupBinding, layoutLookups, 'orgnr', ['string'])[0] ??
      []
    );
  }
}
