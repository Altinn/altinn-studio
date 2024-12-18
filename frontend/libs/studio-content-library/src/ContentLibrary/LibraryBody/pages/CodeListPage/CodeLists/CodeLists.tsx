import React from 'react';
import type { CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';

export type CodeListsProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListsUsages: CodeListReference[];
};

export function CodeLists({
  codeLists,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListsUsages,
}: CodeListsProps) {
  return codeLists.map((codeList) => {
    const codeListSources = getCodeListSourcesById(codeListsUsages, codeList.title);
    return (
      <CodeList
        key={codeList.title}
        codeList={codeList}
        onUpdateCodeListId={onUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListNames}
        codeListSources={codeListSources}
      />
    );
  });
}

export const getCodeListSourcesById = (
  codeListsUsages: CodeListReference[],
  codeListTitle: string,
): CodeListIdSource[] => {
  const codeListUsages: CodeListReference | undefined = codeListsUsages.find(
    (codeListUsage) => codeListUsage.codeListId === codeListTitle,
  );
  return codeListUsages?.codeListIdSources ?? [];
};

type CodeListProps = {
  codeList: CodeListWithMetadata;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
};

function CodeList({
  codeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListSources,
}: CodeListProps) {
  const { t } = useTranslation();

  return (
    <Accordion
      border
      title={t('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: codeList.title,
      })}
    >
      <Accordion.Item defaultOpen={codeListInEditMode === codeList.title}>
        <Accordion.Header>{codeList.title}</Accordion.Header>
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
