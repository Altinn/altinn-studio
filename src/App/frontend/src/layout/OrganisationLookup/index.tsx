import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { ComponentValidationContext, PropsFromGenericComponent } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { validateEmptyFieldOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { OrganisationLookupDef } from 'src/layout/OrganisationLookup/config.def.generated';
import { OrganisationLookupComponent } from 'src/layout/OrganisationLookup/OrganisationLookupComponent';
import { OrganisationLookupSummary } from 'src/layout/OrganisationLookup/OrganisationLookupSummary';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/hooks';
import type { ComponentValidation } from 'src/features/validation';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class OrganisationLookup extends OrganisationLookupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'OrganisationLookup'>>(
    function LayoutComponentOrganisationLookupRender(props, _): JSX.Element | null {
      return <OrganisationLookupComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'OrganisationLookup');
    return Object.values(formData ?? {}).join(', ');
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <OrganisationLookupSummary {...props} />;
  }

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    return null;
  }

  validateEmptyField(ctx: ComponentValidationContext<'OrganisationLookup'>): ComponentValidation[] {
    return validateEmptyFieldOnlyOneBinding(ctx, 'organisation_lookup_orgnr', 'organisation_lookup.error_required');
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'OrganisationLookup'>): string[] {
    const lookupBinding = FormStore.bootstrap.useLookupBinding();
    const layoutLookups = FormStore.bootstrap.useLayoutLookups();
    return (
      validateDataModelBindingsAny(
        baseComponentId,
        bindings,
        lookupBinding,
        layoutLookups,
        'organisation_lookup_orgnr',
        ['string'],
      )[0] ?? []
    );
  }
}
