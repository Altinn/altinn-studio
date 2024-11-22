import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AddToListComponent } from 'src/layout/AddToList/AddToList';
import { AddToListFeatureFlagLayoutValidator } from 'src/layout/AddToList/AddToListFeatureFlagLayoutValidator';
import { AddToListDef } from 'src/layout/AddToList/config.def.generated';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

export class AddToList extends AddToListDef {
  validateDataModelBindings(_: LayoutValidationCtx<'AddToList'>): string[] {
    return [];
  }

  renderLayoutValidators(props: NodeValidationProps<'AddToList'>): React.JSX.Element | null {
    return <AddToListFeatureFlagLayoutValidator {...props} />;
  }

  getDisplayData(_: BaseLayoutNode<'AddToList'>, __: DisplayDataProps): string {
    return '';
  }
  renderSummary(_: SummaryRendererProps<'AddToList'>): JSX.Element | null {
    return <div>summary</div>;
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AddToList'>>(
    function LayoutComponentAddToListRender(props, _): JSX.Element | null {
      return <AddToListComponent {...props} />;
    },
  );
}
