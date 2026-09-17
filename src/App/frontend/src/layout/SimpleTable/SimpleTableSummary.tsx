import React from 'react';

import { AppTable, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Caption } from 'src/components/form/caption/Caption';
import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { isJSONSchema7Definition } from 'src/layout/AddToList/AddToList';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

const emptyArray: never[] = [];

export function SimpleTableSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'SimpleTable');
  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'SimpleTable');
  const required = useEvalExpression(config.required, Expressions.SimpleTable.required);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.SimpleTable.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.SimpleTable.textResourceBindings.title,
  );

  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const title = summaryTitle || resolvedTitle;
  const isMobile = useIsMobile();
  const { langAsString } = useLanguage();

  const schemaLookup = FormStore.bootstrap.useSchemaLookup();

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
        data={Array.isArray(data) ? data : emptyArray}
        columns={config.columns.map((column) => ({ ...column, header: langAsString(column.header) }))}
        mobile={isMobile}
        emptyText={langAsString('general.empty_table')}
      />
    </SummaryFlex>
  );
}
