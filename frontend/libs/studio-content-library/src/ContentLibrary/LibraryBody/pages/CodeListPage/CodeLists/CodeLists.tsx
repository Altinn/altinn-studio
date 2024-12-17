import React from 'react';
import type { CodeListData, CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import { StudioAlert, type CodeList as StudioComponentsCodeList } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';

export type CodeListsProps = {
  codeListsData: CodeListData[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
  codeListsUsages: CodeListReference[];
};

export function CodeLists({
  codeListsData,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListsUsages,
}: CodeListsProps) {
  return codeListsData.map((codeListData) => {
    const codeListSources = getCodeListSourcesById(codeListsUsages, codeListData.title);
    return (
      <CodeList
        key={codeListData.title}
        codeListData={codeListData}
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

type CodeListProps = Omit<CodeListsProps, 'codeListsData' | 'codeListsUsages'> & {
  codeListData: CodeListData;
  codeListSources: CodeListIdSource[];
};

function CodeList({
  codeListData,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
  codeListSources,
}: CodeListProps) {
  const { t } = useTranslation();

  return (
    <Accordion border>
      <Accordion.Item defaultOpen={codeListInEditMode === codeListData.title}>
        <Accordion.Header
          title={t('app_content_library.code_lists.code_list_accordion_title', {
            codeListTitle: codeListData.title,
          })}
        >
          {codeListData.title}
        </Accordion.Header>
        <CodeListAccordionContent
          codeListData={codeListData}
          onUpdateCodeListId={onUpdateCodeListId}
          onUpdateCodeList={onUpdateCodeList}
          codeListNames={codeListNames}
          codeListSources={codeListSources}
        />
      </Accordion.Item>
    </Accordion>
  );
}

type CodeListAccordionContentProps = Omit<CodeListProps, 'codeListInEditMode'>;

function CodeListAccordionContent({
  codeListData,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListNames,
  codeListSources,
}: CodeListAccordionContentProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Accordion.Content>
      {codeListData.hasError ? (
        <StudioAlert size='small' severity='danger'>
          {t('app_content_library.code_lists.fetch_error')}
        </StudioAlert>
      ) : (
        <EditCodeList
          codeList={codeListData.data}
          codeListTitle={codeListData.title}
          onUpdateCodeListId={onUpdateCodeListId}
          onUpdateCodeList={onUpdateCodeList}
          codeListNames={codeListNames}
        />
      )}
    </Accordion.Content>
  );
}

export const updateCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: StudioComponentsCodeList,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};
