import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { CustomButtonDef } from 'src/layout/CustomButton/config.def.generated';
import { CustomButtonComponent } from 'src/layout/CustomButton/CustomButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class CustomButton extends CustomButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'CustomButton'>>(
    function LayoutComponentCustomButtonRender(props, _): JSX.Element | null {
      return <CustomButtonComponent {...props} />;
    },
  );

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(_node: LayoutNode<'Grid'>): string {
    return '';
  }

  validateDataModelBindings(): string[] {
    return [];
  }
}
