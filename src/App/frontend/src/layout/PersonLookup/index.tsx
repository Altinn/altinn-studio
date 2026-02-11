import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { PersonLookupDef } from 'src/layout/PersonLookup/config.def.generated';
import { PersonLookupComponent } from 'src/layout/PersonLookup/PersonLookupComponent';
import { PersonLookupSummary } from 'src/layout/PersonLookup/PersonLookupSummary';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
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

    if (formData.person_lookup_ssn) {
      parts.push(formData.person_lookup_ssn);
    }

    // Build full name from individual parts or use the Name binding
    if (formData.person_lookup_name) {
      parts.push(formData.person_lookup_name);
    } else {
      const nameParts: string[] = [];
      if (formData.person_lookup_first_name) {
        nameParts.push(formData.person_lookup_first_name);
      }
      if (formData.person_lookup_middle_name) {
        nameParts.push(formData.person_lookup_middle_name);
      }
      if (formData.person_lookup_last_name) {
        nameParts.push(formData.person_lookup_last_name);
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

  useEmptyFieldValidation(baseComponentId: string): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(baseComponentId, 'person_lookup_ssn');
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'PersonLookup'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = FormBootstrap.useLayoutLookups();
    return (
      validateDataModelBindingsAny(baseComponentId, bindings, lookupBinding, layoutLookups, 'person_lookup_ssn', [
        'string',
      ])[0] ?? []
    );
  }
}
