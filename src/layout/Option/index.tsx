import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { OptionDef } from 'src/layout/Option/config.def.generated';
import { OptionComponent } from 'src/layout/Option/OptionComponent';
import { OptionSummary } from 'src/layout/Option/OptionSummary';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Option extends OptionDef {
  getDisplayData(
    node: LayoutNode<'Option'>,
    { nodeDataSelector, optionsSelector, langTools }: DisplayDataProps,
  ): string {
    const value = nodeDataSelector((picker) => picker(node)?.item?.value, [node]) ?? '';
    const { options } = optionsSelector(node);
    return getSelectedValueToText(value, langTools, options) || '';
  }

  useDisplayData(node: LayoutNode<'Option'>): string {
    const displayDataProps = useDisplayDataProps();
    return this.getDisplayData(node, displayDataProps);
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Option'>>(function LayoutComponentOptionRender(props, _) {
    return <OptionComponent {...props} />;
  });

  renderSummary2(props: Summary2Props<'Option'>): JSX.Element | null {
    return (
      <OptionSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  evalExpressions(props: ExprResolver<'Option'>) {
    return {
      ...this.evalDefaultExpressions(props),
      value: props.evalStr(props.item.value, ''),
    };
  }
}
