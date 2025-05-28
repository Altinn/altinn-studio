import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useEmptyFieldValidationAllBindings } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { PersonLookupDef } from 'src/layout/PersonLookup/config.def.generated';
import { PersonLookupComponent } from 'src/layout/PersonLookup/PersonLookupComponent';
import { PersonLookupSummary } from 'src/layout/PersonLookup/PersonLookupSummary';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class PersonLookup extends PersonLookupDef {
  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'PersonLookup');
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

  useEmptyFieldValidation(node: LayoutNode<'PersonLookup'>): ComponentValidation[] {
    return useEmptyFieldValidationAllBindings(node, 'person_lookup.error_required');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'PersonLookup'>): string[] {
    return this.validateDataModelBindingsAny(ctx, 'person_lookup_ssn', ['string'])[0] ?? [];
  }
}
