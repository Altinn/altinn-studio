import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { OrganisationLookupDef } from 'src/layout/OrganisationLookup/config.def.generated';
import { OrganisationLookupComponent } from 'src/layout/OrganisationLookup/OrganisationLookupComponent';
import { OrganisationLookupSummary } from 'src/layout/OrganisationLookup/OrganisationLookupSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class OrganisationLookup extends OrganisationLookupDef {
  validateDataModelBindings(_ctx: LayoutValidationCtx<'OrganisationLookup'>): string[] {
    return [];
  }
  getDisplayData(node: LayoutNode<'OrganisationLookup'>, { nodeFormDataSelector }: DisplayDataProps): string {
    const data = nodeFormDataSelector(node);
    return Object.values(data).join(', ');
  }
  renderSummary2(props: Summary2Props<'OrganisationLookup'>): JSX.Element | null {
    return <OrganisationLookupSummary componentNode={props.target} />;
  }
  renderSummary(_props: SummaryRendererProps<'OrganisationLookup'>): JSX.Element | null {
    throw new Error('Method not implemented.');
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'OrganisationLookup'>>(
    function LayoutComponentOrganisationLookupRender(props, _): JSX.Element | null {
      return <OrganisationLookupComponent {...props} />;
    },
  );
}
