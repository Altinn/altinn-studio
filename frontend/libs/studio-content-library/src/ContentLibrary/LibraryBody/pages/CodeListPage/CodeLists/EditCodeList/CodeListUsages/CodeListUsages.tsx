import React from 'react';
import type { CodeListIdSource } from '../../../types/CodeListReference';
import { Table } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './CodeListUsages.module.css';
import { FileNameUtils } from '@studio/pure-functions';

export type CodeListUsagesProps = {
  codeListSources: CodeListIdSource[];
};

export function CodeListUsages({ codeListSources }: CodeListUsagesProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Table zebra className={classes.table}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>
            {t('app_content_library.code_lists.code_list_usage_table_column_header_layout_set')}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t('app_content_library.code_lists.code_list_usage_table_column_header_layout')}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t('app_content_library.code_lists.code_list_usage_table_column_header_components')}
          </Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {codeListSources.map((codeListSource, index) => (
          <CodeListUsageSourceRow key={index} codeListSource={codeListSource} />
        ))}
      </Table.Body>
    </Table>
  );
}

type CodeListUsageSourceRowProps = {
  codeListSource: CodeListIdSource;
};

function CodeListUsageSourceRow({
  codeListSource,
}: CodeListUsageSourceRowProps): React.ReactElement {
  return (
    <Table.Row>
      <Table.Cell>{codeListSource.layoutSetId}</Table.Cell>
      <Table.Cell>{FileNameUtils.removeExtension(codeListSource.layoutName)}</Table.Cell>
      <Table.Cell>{listComponentIds(codeListSource.componentIds)}</Table.Cell>
    </Table.Row>
  );
}

const listComponentIds = (componentIds: string[]): string => {
  return componentIds.join(', ');
};
