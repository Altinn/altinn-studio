import React from 'react';
import type { CodeListWithMetadata } from '../CodeList';
import { Accordion, Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export type CodeListsProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeLists({ codeLists, onUpdateCodeList }: CodeListsProps) {
  return codeLists.map((codeList) => (
    <CodeList key={codeList.title} codeList={codeList} onUpdateCodeList={onUpdateCodeList} />
  ));
}

type CodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

function CodeList({ codeList, onUpdateCodeList }: CodeListProps) {
  const { t } = useTranslation();

  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeList.title}</Accordion.Header>
        <Accordion.Content>
          <Alert size='small'>
            {t('app_content_library.code_lists.edit_code_list_placeholder_text')}
          </Alert>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
