import React from 'react';

import { AppTable, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { pick } from 'dot-object';
import type { FormDataObject } from '@app/form-component';

import { Caption } from 'src/components/form/caption/Caption';
import { useExternalApis } from 'src/core/queries/externalApi';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { isFormDataObject, isFormDataObjectArray } from 'src/layout/SimpleTable/typeguards';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function ApiTableSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'SimpleTable');
  const required = useEvalExpression(config.required, Expressions.SimpleTable.required);
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.SimpleTable.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.SimpleTable.textResourceBindings.title,
  );

  const title =
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ||
    (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle);
  const isMobile = useIsMobile();
  const { langAsString } = useLanguage();
  const { data } = useExternalApis(config.externalApi ? [config.externalApi.id] : []);

  if (!config.externalApi || !data[config.externalApi.id]) {
    return null;
  }

  const value = pick(config.externalApi.path, data[config.externalApi.id]);

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
        columns={config.columns.map((column) => ({ ...column, header: langAsString(column.header) }))}
        mobile={isMobile}
        emptyText={langAsString('general.empty_table')}
      />
    </SummaryFlex>
  );
}
