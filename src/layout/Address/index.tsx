import React from 'react';

import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { AddressDef } from 'src/layout/Address/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends AddressDef {
  render(props: PropsFromGenericComponent<'AddressComponent'>): JSX.Element | null {
    return <AddressComponent {...props} />;
  }

  getDisplayData(node: LayoutNode<'AddressComponent'>): string {
    const data = node.getFormData();
    return Object.values(data).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'AddressComponent'>): JSX.Element | null {
    const data = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }
}
