import React from 'react';

import { Delete as DeleteIcon } from '@navikt/ds-icons';

import { AppTable } from 'src/app-components/table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { TableActionButton } from 'src/app-components/table/Table';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type TableComponentProps = PropsFromGenericComponent<'SimpleTable'>;

type TableSummaryProps = {
  componentNode: LayoutNode<'SimpleTable'>;
};

export function TableSummary({ componentNode }: TableSummaryProps) {
  const { dataModelBindings, textResourceBindings, columns } = useNodeItem(componentNode, (item) => ({
    dataModelBindings: item.dataModelBindings,
    textResourceBindings: item.textResourceBindings,
    columns: item.columns,
  }));

  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const { title } = textResourceBindings ?? {};
  const isMobile = useIsMobile();

  const data = formData.tableData;

  if (!Array.isArray(data)) {
    return null;
  }

  if (data.length < 1) {
    return null;
  }
  return (
    <AppTable<IDataModelReference[]>
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

export function SimpleTableComponent({ node }: TableComponentProps) {
  const item = useNodeItem(node);
  const { formData } = useDataModelBindings(item.dataModelBindings, 1, 'raw');
  const removeFromList = FD.useRemoveFromListCallback();
  const { title, description, help } = item.textResourceBindings ?? {};
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const isMobile = useIsMobile();

  const data = formData.tableData;

  if (!Array.isArray(data)) {
    return null;
  }

  if (data.length < 1) {
    return null;
  }

  const actionButtons: TableActionButton[] = [];

  if (item.enableDelete) {
    actionButtons.push({
      onClick: (idx) => {
        removeFromList({
          startAtIndex: idx,
          reference: {
            dataType: item.dataModelBindings.tableData.dataType,
            field: item.dataModelBindings.tableData.field,
          },
          callback: (_) => true,
        });
      },
      buttonText: <Lang id='general.delete' />,
      icon: <DeleteIcon />,
      color: 'danger',
    });
  }

  return (
    <AppTable<IDataModelReference[]>
      zebra={item.zebra}
      size={item.size}
      caption={
        title && (
          <Caption
            title={<Lang id={title} />}
            description={description && <Lang id={description} />}
            helpText={help ? { text: <Lang id={help} />, accessibleTitle } : undefined}
          />
        )
      }
      data={data}
      columns={item.columns.map((config) => ({
        ...config,
        header: <Lang id={config.header} />,
      }))}
      mobile={isMobile}
      actionButtons={actionButtons}
      actionButtonHeader={<Lang id='general.action' />}
    />
  );
}
