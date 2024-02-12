import React from 'react';
import type { JSX } from 'react';

import { CustomButtonDef } from 'src/layout/CustomButton/config.def.generated';
import { CustomButtonComponent } from 'src/layout/CustomButton/CustomButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class CustomButton extends CustomButtonDef {
  render = (props: PropsFromGenericComponent<'CustomButton'>): JSX.Element | null => (
    <CustomButtonComponent {...props} />
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
