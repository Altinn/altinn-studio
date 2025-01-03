import React from 'react';
import type { CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';

export type CodeListsProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
};

export function CodeLists({
  codeLists,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
}: CodeListsProps) {
  return codeLists.map((codeList) => (
    <CodeList
      key={codeList.title}
      codeList={codeList}
      onUpdateCodeListId={onUpdateCodeListId}
      onUpdateCodeList={onUpdateCodeList}
      codeListInEditMode={codeListInEditMode}
      codeListNames={codeListNames}
    />
  ));
}

type CodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
};

function CodeList({
  codeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
}: CodeListProps) {
  const { t } = useTranslation();

  return (
    <Accordion border>
      <Accordion.Item defaultOpen={codeListInEditMode === codeList.title}>
        <Accordion.Header
          title={t('app_content_library.code_lists.code_list_accordion_title', {
            codeListTitle: codeList.title,
          })}
        >
          {codeList.title}
        </Accordion.Header>
        <Accordion.Content>
          <EditCodeList
            codeList={codeList}
            onUpdateCodeListId={onUpdateCodeListId}
            onUpdateCodeList={onUpdateCodeList}
            codeListNames={codeListNames}
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

export const updateCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: StudioComponentsCodeList,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};
