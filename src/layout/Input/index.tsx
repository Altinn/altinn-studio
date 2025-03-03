import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatNumericText } from '@digdir/design-system-react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { InputDef } from 'src/layout/Input/config.def.generated';
import { evalFormatting } from 'src/layout/Input/formatting';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { InputSummary } from 'src/layout/Input/InputSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Input extends InputDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Input'>>(
    function LayoutComponentInputRender(props, _): JSX.Element | null {
      return <InputComponent {...props} />;
    },
  );

  getDisplayData({ currentLanguage, formData, nodeId, nodeDataSelector }: DisplayDataProps<'Input'>): string {
    const text = formData?.simpleBinding || '';
    if (!text) {
      return '';
    }

    const formatting = nodeDataSelector((picker) => picker(nodeId, 'Input')?.item?.formatting, [nodeId]);
    const numberFormatting = getMapToReactNumberConfig(formatting, text, currentLanguage);

    if (numberFormatting?.number) {
      return formatNumericText(text, numberFormatting.number);
    }

    return text;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Input'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'Input'>): JSX.Element | null {
    return (
      <InputSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Input'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }

  evalExpressions(props: ExprResolver<'Input'>) {
    return {
      ...this.evalDefaultExpressions(props),
      formatting: evalFormatting(props),
    };
  }
}
