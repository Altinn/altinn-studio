import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AddToListComponent } from 'src/layout/AddToList/AddToList';
import { AddToListFeatureFlagLayoutValidator } from 'src/layout/AddToList/AddToListFeatureFlagLayoutValidator';
import { AddToListDef } from 'src/layout/AddToList/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class AddToList extends AddToListDef {
  useDataModelBindingValidation(_node: LayoutNode<'AddToList'>, _bindings: IDataModelBindings<'AddToList'>): string[] {
    return [];
  }
  renderLayoutValidators(props: NodeValidationProps<'AddToList'>): React.JSX.Element | null {
    return <AddToListFeatureFlagLayoutValidator {...props} />;
  }
  renderSummary(_: SummaryRendererProps<'AddToList'>): JSX.Element | null {
    return <div>summary</div>; // TODO: Implment?
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AddToList'>>(
    function LayoutComponentAddToListRender(props, _): JSX.Element | null {
      return <AddToListComponent {...props} />;
    },
  );
}
