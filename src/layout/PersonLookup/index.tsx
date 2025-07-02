import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useEmptyFieldValidationAllBindings } from 'src/features/validation/nodeValidation/emptyFieldValidation';
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
    return Object.values(formData ?? {}).join(', ');
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PersonLookup'>>(
    function LayoutComponentPersonLookupRender(props, _): JSX.Element | null {
      return <PersonLookupComponent {...props} />;
    },
  );

  renderSummary(_props: SummaryRendererProps<'PersonLookup'>): JSX.Element | null {
    return null;
  }

  renderSummary2(props: Summary2Props<'PersonLookup'>): JSX.Element | null {
    return <PersonLookupSummary componentNode={props.target} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  useEmptyFieldValidation(baseComponentId: string): ComponentValidation[] {
    return useEmptyFieldValidationAllBindings(baseComponentId, 'person_lookup.error_required');
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'PersonLookup'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    return (
      validateDataModelBindingsAny(baseComponentId, bindings, lookupBinding, layoutLookups, 'person_lookup_ssn', [
        'string',
      ])[0] ?? []
    );
  }
}
