import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { TextDef } from 'src/layout/Text/config.def.generated';
import { TextComponent } from 'src/layout/Text/TextComponent';
import { TextSummary } from 'src/layout/Text/TextSummary';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Text extends TextDef {
  getDisplayData(node: LayoutNode<'Text'>, { nodeDataSelector }: DisplayDataProps): string {
    const text = nodeDataSelector((picker) => picker(node)?.item?.value, [node]);
    if (!text) {
      return '';
    }
    return text;
  }

  useDisplayData(node: LayoutNode<'Text'>): string {
    const displayDataProps = useDisplayDataProps();
    return this.getDisplayData(node, displayDataProps);
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Text'>>(
    function LayoutComponentTextRender(props, _): JSX.Element | null {
      return <TextComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Text'>): JSX.Element | null {
    return (
      <TextSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  evalExpressions(props: ExprResolver<'Text'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
