import React from 'react';
import type { CodeListWithMetadata } from '../CodeList';
import { Accordion, Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import type { UseLibraryQuery } from '../../../../../types/useLibraryQuery';
import type { CodeList as StudioComponentCodeList } from '@studio/components';

export type CodeListsProps = {
  codeListIds: string[];
  getCodeList: UseLibraryQuery<StudioComponentCodeList>;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeLists({ codeListIds, getCodeList, onUpdateCodeList }: CodeListsProps) {
  return codeListIds.map((codeListId) => (
    <CodeList
      key={codeListId}
      codeListId={codeListId}
      getCodeList={getCodeList}
      onUpdateCodeList={onUpdateCodeList}
    />
  ));
}

type CodeListProps = {
  codeListId: string;
  getCodeList: UseLibraryQuery<StudioComponentCodeList>;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

function CodeList({ codeListId, getCodeList, onUpdateCodeList }: CodeListProps) {
  const { t } = useTranslation();

  const { isError: codeListError } = getCodeList(codeListId);

  const codeListText = codeListError
    ? t('app_content_library.code_lists.fetch_error')
    : t('app_content_library.code_lists.edit_code_list_placeholder_text');

  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeListId}</Accordion.Header>
        <Accordion.Content>
          <Alert size='small' severity={codeListError ? 'danger' : 'info'}>
            {codeListText}
          </Alert>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
