import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { SamtaleComponent } from 'src/layout/Samtale/SamtaleComponent';
import { SamtaleDef } from 'src/layout/Samtale/config.def.generated';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext, PropsFromGenericComponent } from 'src/layout';

export class Samtale extends SamtaleDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Samtale'>>(
    function LayoutComponentSamtaleRender(props, _): JSX.Element | null {
      return <SamtaleComponent {...props} />;
    },
  );

  useDisplayData(): string {
    return '';
  }

  renderSummary(): JSX.Element | null {
    return null;
  }

  /**
   * Stegene er komponentens egne bindinger, ikke `dataModelBindings`, så
   * standardvalideringen finner dem ikke. Uten dette ville et ubesvart steg
   * sluppet gjennom innsendingen, og det som henger på svarene lenger ned i
   * skjemaet ville stått skjult og dermed også uvalidert.
   */
  validateEmptyField(ctx: ComponentValidationContext<'Samtale'>): ComponentValidation[] {
    const alle = ctx.component.steg ?? [];
    // Avsluttet samtalen tidlig, kreves ikke stegene som falt bort.
    const sluttIndeks = alle.findIndex(
      (s) => s.avsluttVerdi && s.binding && readDataFromState(ctx.formState, s.binding) === s.avsluttVerdi,
    );
    const steg = sluttIndeks === -1 ? alle : alle.slice(0, sluttIndeks + 1);
    const validations: ComponentValidation[] = [];

    for (const s of steg) {
      if (s.valgfritt || !s.binding) {
        continue;
      }
      const data = readDataFromState(ctx.formState, s.binding);
      const asString = typeof data === 'string' || typeof data === 'number' ? String(data) : '';
      if (asString.trim().length === 0) {
        validations.push({
          source: FrontendValidationSource.EmptyField,
          bindingKey: s.id,
          message: { key: 'form_filler.error_required', params: [{ key: s.sporsmaal, makeLowerCase: true }] },
          severity: 'error',
          category: ValidationMask.Required,
        });
      }
    }
    return validations;
  }
}
