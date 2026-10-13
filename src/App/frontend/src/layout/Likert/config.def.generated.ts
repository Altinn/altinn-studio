import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class LikertDef extends ContainerComponent<'Likert'> {
  protected readonly type = 'Likert';

  directRender(): boolean {
    return true;
  }

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Likert'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 04a19b81cb80b8b104edac147cb7b7e93182a5c097bc61dbdc8feb76c20be796
