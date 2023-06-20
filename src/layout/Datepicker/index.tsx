import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { getDateFormat } from 'src/utils/dateHelpers';
import { formatISOString } from 'src/utils/formatDate';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompDatepicker } from 'src/layout/Datepicker/types';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Datepicker extends FormComponent<'Datepicker'> {
  render(props: PropsFromGenericComponent<'Datepicker'>): JSX.Element | null {
    return <DatepickerComponent {...props} />;
  }

  useDisplayData(node: LayoutNodeFromType<'Datepicker'>): string {
    const formData = useAppSelector((state) => state.formData.formData);
    const language = useAppSelector(appLanguageStateSelector);
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const dateFormat = getDateFormat(node.item.format, language);
    const data = formData[node.item.dataModelBindings?.simpleBinding] || '';
    return formatISOString(data, dateFormat) ?? data;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Datepicker'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        hideFromVisualTesting={true}
      />
    );
  }
}

export const Config = {
  def: new Datepicker(),
};

export type TypeConfig = {
  layout: ILayoutCompDatepicker;
  nodeItem: ExprResolved<ILayoutCompDatepicker>;
  nodeObj: LayoutNode;
};
