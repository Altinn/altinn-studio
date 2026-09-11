import React from 'react';
import type { CodeListIdSource } from '../../../types/CodeListReference';
import { StudioTable } from '@studio/components';
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
    <StudioTable zebra className={classes.table}>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>
            {t(
              'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_task_type',
            )}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t(
              'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_task_name',
            )}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t(
              'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_layout',
            )}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t(
              'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_components',
            )}
          </StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {codeListSources.map((codeListSource, index) => (
          <CodeListUsageSourceRow key={index} codeListSource={codeListSource} />
        ))}
      </StudioTable.Body>
    </StudioTable>
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
    <StudioTable.Row>
      <StudioTable.Cell>{t(taskTypeTextKey)}</StudioTable.Cell>
      <StudioTable.Cell>{taskId}</StudioTable.Cell>
      <StudioTable.Cell>{FileNameUtils.removeExtension(layoutName)}</StudioTable.Cell>
      <StudioTable.Cell>{ArrayUtils.toString(componentIds, ', ')}</StudioTable.Cell>
    </StudioTable.Row>
  );
}
