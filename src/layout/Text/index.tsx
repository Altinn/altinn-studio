import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { TextDef } from 'src/layout/Text/config.def.generated';
import { TextComponent } from 'src/layout/Text/TextComponent';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Text extends TextDef {
  getDisplayData(node: LayoutNode<'Text'>, { nodeDataSelector }: DisplayDataProps): string {
    const text = nodeDataSelector((picker) => picker(node)?.item?.value, [node]);
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

  evalExpressions(props: ExprResolver<'Text'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
