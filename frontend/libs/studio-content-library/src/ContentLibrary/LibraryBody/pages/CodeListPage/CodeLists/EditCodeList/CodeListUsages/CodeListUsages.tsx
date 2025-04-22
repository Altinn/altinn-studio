import React from 'react';
import type { CodeListIdSource } from '../../../types/CodeListReference';
import { Table } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './CodeListUsages.module.css';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { getUsageTaskTypeTextKey } from '../../../utils';

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
            {t('app_content_library.code_lists.code_list_usage_table_column_header_task_type')}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t('app_content_library.code_lists.code_list_usage_table_column_header_task_name')}
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
  const { t } = useTranslation();
  const { taskId, taskType, layoutName, componentIds } = codeListSource;
  const taskTypeTextKey = getUsageTaskTypeTextKey(taskType);

  return (
    <Table.Row>
      <Table.Cell>{t(taskTypeTextKey)}</Table.Cell>
      <Table.Cell>{taskId}</Table.Cell>
      <Table.Cell>{FileNameUtils.removeExtension(layoutName)}</Table.Cell>
      <Table.Cell>{ArrayUtils.toString(componentIds, ', ')}</Table.Cell>
    </Table.Row>
  );
}
