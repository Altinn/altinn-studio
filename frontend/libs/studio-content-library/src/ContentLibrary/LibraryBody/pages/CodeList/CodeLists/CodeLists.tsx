import React from 'react';
import type { CodeListWithMetadata, OnGetCodeListResult } from '../CodeList';
import { Accordion, Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export type CodeListsProps = {
  codeListIds: string[];
  onGetCodeList: (codeListId: string) => OnGetCodeListResult;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeLists({ codeListIds, onGetCodeList, onUpdateCodeList }: CodeListsProps) {
  return codeListIds.map((codeListId) => (
    <CodeList
      key={codeListId}
      codeList={onGetCodeList(codeListId)}
      onUpdateCodeList={onUpdateCodeList}
    />
  ));
}

type CodeListProps = {
  codeList: OnGetCodeListResult;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

function CodeList({ codeList, onUpdateCodeList }: CodeListProps) {
  const { t } = useTranslation();

  const codeListText = codeList.isError
    ? t('app_content_library.code_lists.fetch_error')
    : t('app_content_library.code_lists.edit_code_list_placeholder_text');

  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeList.codeListWithMetadata.title}</Accordion.Header>
        <Accordion.Content>
          <Alert size='small' severity={codeList.isError ? 'danger' : 'info'}>
            {codeListText}
          </Alert>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
