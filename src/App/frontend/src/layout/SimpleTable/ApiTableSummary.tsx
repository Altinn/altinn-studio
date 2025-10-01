import React from 'react';

import { pick } from 'dot-object';

import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { Lang } from 'src/features/language/Lang';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { isFormDataObject, isFormDataObjectArray } from 'src/layout/SimpleTable/typeguards';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { FormDataObject } from 'src/app-components/DynamicForm/DynamicForm';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function ApiTableSummary({ targetBaseComponentId }: Summary2Props) {
  const { externalApi, textResourceBindings, columns, required } = useItemWhenType(
    targetBaseComponentId,
    'SimpleTable',
  );

  const { title } = textResourceBindings ?? {};
  const isMobile = useIsMobile();
  const { data } = useExternalApis(externalApi ? [externalApi.id] : []);

  if (!externalApi || !data[externalApi.id]) {
    return null;
  }

  const value = pick(externalApi.path, data[externalApi.id]);

  if (!value || (!isFormDataObject(value) && !isFormDataObjectArray(value))) {
    return null;
  }

  let dataToDisplay: FormDataObject[] = [];

  if (!Array.isArray(value)) {
    dataToDisplay.push(value);
  } else {
    dataToDisplay = value;
  }
  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        !Array.isArray(data) || data.length === 0
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <AppTable
        caption={title && <Caption title={<Lang id={title} />} />}
        data={dataToDisplay}
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
