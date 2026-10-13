import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class RepeatingGroupDef extends ContainerComponent<'RepeatingGroup'> {
  protected readonly type = 'RepeatingGroup';

  directRender(): boolean {
    return true;
  }

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'RepeatingGroup'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 5f703629c9649263530ce7f1c0e14c17253b0d6054bda788dcfb764ce8de52dc
