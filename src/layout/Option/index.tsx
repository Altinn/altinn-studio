import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { OptionDef } from 'src/layout/Option/config.def.generated';
import { OptionComponent } from 'src/layout/Option/OptionComponent';
import { OptionSummary } from 'src/layout/Option/OptionSummary';
import type { DisplayData, DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Option extends OptionDef implements DisplayData<'Option'> {
  getDisplayData({ nodeDataSelector, nodeId, optionsSelector, langTools }: DisplayDataProps<'Option'>): string {
    const value = nodeDataSelector((picker) => picker(nodeId, 'Option')?.item?.value, [nodeId]) ?? '';
    const { options } = optionsSelector(nodeId);
    return getSelectedValueToText(value, langTools, options) || '';
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
