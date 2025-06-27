import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { OrganisationLookupDef } from 'src/layout/OrganisationLookup/config.def.generated';
import { OrganisationLookupComponent } from 'src/layout/OrganisationLookup/OrganisationLookupComponent';
import { OrganisationLookupSummary } from 'src/layout/OrganisationLookup/OrganisationLookupSummary';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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

  renderSummary2(props: Summary2Props<'OrganisationLookup'>): JSX.Element | null {
    return <OrganisationLookupSummary componentNode={props.target} />;
  }

  renderSummary(_props: SummaryRendererProps<'OrganisationLookup'>): JSX.Element | null {
    return null;
  }

  useEmptyFieldValidation(node: LayoutNode<'OrganisationLookup'>): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(
      node,
      'organisation_lookup_orgnr',
      'organisation_lookup.error_required',
    );
  }

  useDataModelBindingValidation(
    node: LayoutNode<'OrganisationLookup'>,
    bindings: IDataModelBindings<'OrganisationLookup'>,
  ): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    return (
      validateDataModelBindingsAny(node, bindings, lookupBinding, 'organisation_lookup_orgnr', ['string'])[0] ?? []
    );
  }
}
