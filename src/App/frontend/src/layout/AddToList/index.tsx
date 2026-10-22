import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AddToListComponent } from 'src/layout/AddToList/AddToList';
import { AddToListFeatureFlagLayoutValidator } from 'src/layout/AddToList/AddToListFeatureFlagLayoutValidator';
import { AddToListDef } from 'src/layout/AddToList/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentLayoutValidationProps, IDataModelBindings } from 'src/layout/layout';

export class AddToList extends AddToListDef {
  validateDataModelBindings(_baseComponentId: string, _bindings: IDataModelBindings<'AddToList'>): string[] {
    return [];
  }
  renderLayoutValidators(props: ComponentLayoutValidationProps<'AddToList'>): React.JSX.Element | null {
    return <AddToListFeatureFlagLayoutValidator {...props} />;
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AddToList'>>(
    function LayoutComponentAddToListRender(props, _): JSX.Element | null {
      return <AddToListComponent {...props} />;
    },
  );
}
