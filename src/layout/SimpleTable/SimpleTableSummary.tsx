import React from 'react';

import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { isJSONSchema7Definition } from 'src/layout/AddToList/AddToList';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type TableSummaryProps = {
  componentNode: LayoutNode<'SimpleTable'>;
};

const emptyArray: never[] = [];

export function SimpleTableSummary({ componentNode }: TableSummaryProps) {
  const { dataModelBindings, textResourceBindings, columns, required } = useNodeItem(componentNode, (item) => ({
    dataModelBindings: item.dataModelBindings,
    textResourceBindings: item.textResourceBindings,
    columns: item.columns,
    required: item.required,
  }));

  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const { title } = textResourceBindings ?? {};
  const isMobile = useIsMobile();

  const { schemaLookup } = DataModels.useFullStateRef().current;

  if (!dataModelBindings) {
    return null;
  }

  const schema = schemaLookup[dataModelBindings.tableData.dataType].getSchemaForPath(
    dataModelBindings.tableData.field,
  )[0];

  const data = formData.tableData;

  if (!schema?.items) {
    return null;
  }

  if (!isJSONSchema7Definition(schema?.items)) {
    return null;
  }

  return (
    <SummaryFlex
      target={componentNode}
      content={
        !Array.isArray(data) || data.length === 0
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <AppTable
        schema={schema}
        caption={title && <Caption title={<Lang id={title} />} />}
        data={Array.isArray(data) ? data : emptyArray}
        columns={columns.map((config) => ({
          ...config,
          header: <Lang id={config.header} />,
        }))}
        mobile={isMobile}
        emptyText={<Lang id='general.empty_table' />}
      />
    </SummaryFlex>
  );
}
