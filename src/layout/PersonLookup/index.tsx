import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PersonLookupDef } from 'src/layout/PersonLookup/config.def.generated';
import { PersonLookupComponent } from 'src/layout/PersonLookup/PersonLookupComponent';
import { PersonLookupSummary } from 'src/layout/PersonLookup/PersonLookupSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class PersonLookup extends PersonLookupDef {
  getDisplayData({ formData }: DisplayDataProps<'PersonLookup'>): string {
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

  validateDataModelBindings(ctx: LayoutValidationCtx<'PersonLookup'>): string[] {
    return this.validateDataModelBindingsAny(ctx, 'person_lookup_ssn', ['string'])[0] ?? [];
  }
}
