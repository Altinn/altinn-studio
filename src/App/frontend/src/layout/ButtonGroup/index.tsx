import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { ButtonGroupComponent } from 'src/layout/ButtonGroup/ButtonGroupComponent';
import { ButtonGroupDef } from 'src/layout/ButtonGroup/config.def.generated';
import { claimNonRepeatingChildren } from 'src/utils/layout/plugins/claimNonRepeatingChildren';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export class ButtonGroup extends ButtonGroupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'ButtonGroup'>>(
    function LayoutComponentButtonGroupRender(props, _): JSX.Element | null {
      return <ButtonGroupComponent {...props} />;
    },
  );

  shouldRenderInAutomaticPDF() {
    return false;
  }

  renderSummary(): JSX.Element | null {
    return null;
  }

  claimChildren(props: ChildClaimerProps<'ButtonGroup'>): void {
    claimNonRepeatingChildren(props, props.item.children, {
      onlyWithCapability: 'renderInButtonGroup',
      componentType: 'ButtonGroup',
    });
  }
}
