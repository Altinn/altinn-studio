import React from 'react';
import type { CodeListIdSource } from '../../../types/CodeListReference';
import { Table } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './CodeListUsages.module.css';
import { FileNameUtils } from '@studio/pure-functions';
import { StudioTag, StudioTagProps } from '@studio/components-legacy';

export type CodeListUsagesProps = {
  codeListSources: CodeListIdSource[];
};

export function CodeListUsages({ codeListSources }: CodeListUsagesProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Table zebra className={classes.table}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Oppgavetype</Table.HeaderCell>
          <Table.HeaderCell>Oppgavenavn</Table.HeaderCell>
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
  const translatedTaskType = translateTaskType(codeListSource.taskType);
  const colorClass =
    codeListSource.taskType === 'data'
      ? classes.tagTypeData
      : codeListSource.taskType === 'signing'
        ? classes.tagTypeSigning
        : undefined;

  return (
    <Table.Row>
      <Table.Cell>
        <StudioTag className={`${classes.tag} ${colorClass}`} size={'md'}>
          {translatedTaskType}
        </StudioTag>
      </Table.Cell>
      <Table.Cell>{codeListSource.taskId}</Table.Cell>
      <Table.Cell>{codeListSource.layoutSetId}</Table.Cell>
      <Table.Cell>{FileNameUtils.removeExtension(codeListSource.layoutName)}</Table.Cell>
      <Table.Cell>{listComponentIds(codeListSource.componentIds)}</Table.Cell>
    </Table.Row>
  );
}

const listComponentIds = (componentIds: string[]): string => {
  return componentIds.join(', ');
};

const translateTaskType = (taskType: string): string => {
  switch (taskType) {
    case 'data':
      return 'Utfylling';
    case 'signing':
      return 'Signering';
  }
};
