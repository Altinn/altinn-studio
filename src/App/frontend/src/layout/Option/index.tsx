import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { OptionDef } from 'src/layout/Option/config.def.generated';
import { OptionComponent } from 'src/layout/Option/OptionComponent';
import { OptionSummary } from 'src/layout/Option/OptionSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { DisplayData } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Option extends OptionDef implements DisplayData {
  useDisplayData(baseComponentId: string): string {
    const config = useComponentConfig(baseComponentId, 'Option');
    const evaluatedValue = useEvalExpression(config.value, Expressions.Option.value);

    const value = evaluatedValue ?? '';
    const options = useOptionsFor(baseComponentId, 'single').options;
    const langTools = useLanguage();
    return getSelectedValueToText(value, langTools, options) || '';
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Option'>>(function LayoutComponentOptionRender(props, _) {
    return <OptionComponent {...props} />;
  });

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <OptionSummary {...props} />;
  }
}
