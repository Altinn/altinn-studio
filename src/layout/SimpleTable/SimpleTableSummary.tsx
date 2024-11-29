import React from 'react';

import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { isJSONSchema7Definition } from 'src/layout/AddToList/AddToList';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type TableSummaryProps = {
  componentNode: LayoutNode<'SimpleTable'>;
};

export function SimpleTableSummary({ componentNode }: TableSummaryProps) {
  const { dataModelBindings, textResourceBindings, columns } = useNodeItem(componentNode, (item) => ({
    dataModelBindings: item.dataModelBindings,
    textResourceBindings: item.textResourceBindings,
    columns: item.columns,
  }));

  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const { title } = textResourceBindings ?? {};
  const isMobile = useIsMobile();

  const { schemaLookup } = DataModels.useFullStateRef().current;

  const schema = schemaLookup[dataModelBindings.tableData.dataType].getSchemaForPath(
    dataModelBindings.tableData.field,
  )[0];

  const data = formData.tableData;

  if (!Array.isArray(data)) {
    return null;
  }

  if (data.length < 1) {
    return null;
  }

  if (!schema?.items) {
    return null;
  }

  if (!isJSONSchema7Definition(schema?.items)) {
    return null;
  }

  return (
    <AppTable
      schema={schema}
      caption={title && <Caption title={<Lang id={title} />} />}
      data={data}
      columns={columns.map((config) => ({
        ...config,
        header: <Lang id={config.header} />,
      }))}
      mobile={isMobile}
    />
  );
}
