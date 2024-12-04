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
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class PersonLookup extends PersonLookupDef {
  getDisplayData(node: LayoutNode<'PersonLookup'>, { nodeFormDataSelector }: DisplayDataProps): string {
    const data = nodeFormDataSelector(node);
    return Object.values(data).join(', ');
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PersonLookup'>>(
    function LayoutComponentPersonLookupRender(props, _): JSX.Element | null {
      return <PersonLookupComponent {...props} />;
    },
  );

  renderSummary(_props: SummaryRendererProps<'PersonLookup'>): JSX.Element | null {
    throw new Error('Method not implemented.');
  }

  renderSummary2(props: Summary2Props<'PersonLookup'>): JSX.Element | null {
    return <PersonLookupSummary componentNode={props.target} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  validateDataModelBindings(_ctx: LayoutValidationCtx<'PersonLookup'>): string[] {
    return [];
  }
}
