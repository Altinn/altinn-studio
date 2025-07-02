import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { TextDef } from 'src/layout/Text/config.def.generated';
import { TextComponent } from 'src/layout/Text/TextComponent';
import { TextSummary } from 'src/layout/Text/TextSummary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Text extends TextDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const item = useItemWhenType(baseComponentId, 'Text');
    const text = item?.value;
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

  renderSummary2(props: Summary2Props<'Text'>): JSX.Element | null {
    return <TextSummary {...props} />;
  }

  evalExpressions(props: ExprResolver<'Text'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
