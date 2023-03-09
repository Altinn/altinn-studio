import React from 'react';

import { formatNumericText } from '@altinn/altinn-design-system';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { SummaryItemSimple } from 'src/components/summary/SummaryItemSimple';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NumberFormatProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export class Input extends FormComponent<'Input'> {
  render(props: PropsFromGenericComponent<'Input'>): JSX.Element | null {
    return <InputComponent {...props} />;
  }

  useDisplayData(node: LayoutNodeFromType<'Input'>): string {
    const formData = useAppSelector((state) => state.formData.formData);
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const text = formData[node.item.dataModelBindings.simpleBinding] || '';
    const numberFormatting = node.item.formatting?.number as NumberFormatProps | undefined;
    if (numberFormatting) {
      return formatNumericText(text, numberFormatting);
    }

    return text;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Input'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }
}
