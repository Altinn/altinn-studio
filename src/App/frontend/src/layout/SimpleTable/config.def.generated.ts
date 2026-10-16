import type { JSX } from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class SimpleTableDef extends FormComponent<'SimpleTable'> {
  protected readonly type = 'SimpleTable';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'SimpleTable'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: b25c0e0eee89943b00a90d25abb6af27a79b904a9f9a33911b90c66f4eadceec
