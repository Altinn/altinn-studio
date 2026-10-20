import type { JSX } from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class ImageUploadDef extends FormComponent<'ImageUpload'> implements DisplayData {
  protected readonly type = 'ImageUpload';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'ImageUpload'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: cbe02e908f8706c1bdf9309481ae728edb20a7424282f62690868a8cc3d5f326
