import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { TextDef } from 'src/layout/Text/config.def.generated';
import { TextComponent } from 'src/layout/Text/TextComponent';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Text extends TextDef {
  getDisplayData(node: LayoutNode<'Text'>, _extraProp: DisplayDataProps): string {
    const text = node.item.value;
    if (!text) {
      return '';
    }
    return text;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Text'>>(
    function LayoutComponentTextRender(props, _): JSX.Element | null {
      return <TextComponent {...props} />;
    },
  );
}
