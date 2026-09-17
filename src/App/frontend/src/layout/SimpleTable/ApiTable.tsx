import React from 'react';

import { AppTable, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Link } from '@digdir/designsystemet-react';
import { pick } from 'dot-object';
import type { FormDataObject } from '@app/form-component';
import type { DataConfig } from '@app/layout-contract/generated/components/SimpleTable/config.generated';

import { Caption } from 'src/components/form/caption/Caption';
import { useExternalApis } from 'src/core/queries/externalApi';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { isFormDataObject, isFormDataObjectArray } from 'src/layout/SimpleTable/typeguards';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

interface ApiTableProps extends PropsFromGenericComponent<'SimpleTable'> {
  externalApi: DataConfig;
}

export function ApiTable({ baseComponentId, externalApi }: ApiTableProps) {
  const config = useComponentConfig(baseComponentId, 'SimpleTable');
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.SimpleTable.textResourceBindings.title,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.SimpleTable.textResourceBindings.description,
  );
  const help = useEvalOptionalText(
    config.textResourceBindings?.help,
    Expressions.SimpleTable.textResourceBindings.help,
  );

  const { elementAsString, langAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const isMobile = useIsMobile();
  const { data } = useExternalApis([externalApi.id]);

  if (!data[externalApi.id]) {
    return null;
  }

  const value = pick(externalApi.path, data[externalApi.id]);

  if (!value) {
    return null;
  }

  let dataToDisplay: FormDataObject[] = [];

  if (!isFormDataObject(value) && !isFormDataObjectArray(value)) {
    return;
  }

  if (!Array.isArray(value)) {
    dataToDisplay.push(value);
  } else {
    dataToDisplay = value;
  }

  return (
    <AppTable
      zebra={config.zebra}
      size={config.size}
      caption={
        title && (
          <Caption
            title={<Lang id={title} />}
            description={description && <Lang id={description} />}
            helpText={
              help
                ? {
                    text: <Lang id={help} />,
                    accessibleTitle,
                  }
                : undefined
            }
          />
        )
      }
      data={dataToDisplay}
      stickyHeader={true}
      emptyText={langAsString('general.empty_table')}
      columns={config.columns.map((config) => {
        let renderCell;
        if (config.component) {
          const component = config.component;
          renderCell = (_, __, rowIndex) => {
            const rowData = dataToDisplay[rowIndex];
            if (component.type === 'link') {
              const href = pick(component.hrefPath, rowData);
              const text = pick(component.textPath, rowData);
              return (
                <Link
                  href={href}
                  target={component.openInNewTab ? '_blank' : undefined}
                >
                  {text}
                </Link>
              );
            }
          };
        }

        return {
          ...config,
          header: langAsString(config.header),
          renderCell,
        };
      })}
      mobile={isMobile}
      actionButtonHeader={langAsString('general.action')}
    />
  );
}
