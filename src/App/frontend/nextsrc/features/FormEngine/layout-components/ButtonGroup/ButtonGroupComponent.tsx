import React from 'react';

import { renderComponent } from 'nextsrc/features/FormEngine/layout-components';
import type { Override } from 'nextsrc/features/FormEngine/types';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompButtonGroupExternal } from 'src/layout/ButtonGroup/config.generated';

export function ButtonGroupComponent(props: OverriddenButtonGroupWithChildComponents) {
  if (props.children.some((child) => !['Button', 'CustomButton'].includes(child.type))) {
    throw new Error(`Only Button or CustomButton in Button group, got: ${props.type}`);
  }
  return props.children.map((button) => <React.Fragment key={button.id}>{renderComponent(button)}</React.Fragment>);
}

type OverriddenButtonGroupWithChildComponents = Override<CompButtonGroupExternal, 'children', ResolvedCompExternal[]>;

export function isButtonGroup(props: ResolvedCompExternal): props is OverriddenButtonGroupWithChildComponents {
  return props.type === 'ButtonGroup' && Array.isArray(props.children);
}
