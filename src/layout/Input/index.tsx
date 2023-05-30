import React from 'react';

import { formatNumericText } from '@digdir/design-system-react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompInput } from 'src/layout/Input/types';
import type { IInputFormatting } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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

    const numberFormatting = useMapToReactNumberConfig(node.item.formatting as IInputFormatting, text);

    if (numberFormatting?.number) {
      return formatNumericText(text, numberFormatting.number);
    }

    return text;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Input'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }
}

export const Config = {
  def: new Input(),
};

export type TypeConfig = {
  layout: ILayoutCompInput;
  nodeItem: ExprResolved<ILayoutCompInput>;
  nodeObj: LayoutNode;
};
