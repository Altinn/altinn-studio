import React from 'react';
import type { CodeListData, CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import { StudioAlert, type CodeList as StudioComponentsCodeList } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';
import { useTranslation } from 'react-i18next';

export type CodeListsProps = {
  codeListsData: CodeListData[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
};

export function CodeLists({
  codeListsData,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
}: CodeListsProps) {
  return codeListsData.map((codeListData) => (
    <CodeList
      key={codeListData.title}
      codeListData={codeListData}
      onUpdateCodeListId={onUpdateCodeListId}
      onUpdateCodeList={onUpdateCodeList}
      codeListInEditMode={codeListInEditMode}
      codeListNames={codeListNames}
    />
  ));
}

type CodeListProps = {
  codeListData: CodeListData;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListInEditMode: string | undefined;
  codeListNames: string[];
};

function CodeList({
  codeListData,
  onUpdateCodeListId,
  onUpdateCodeList,
  codeListInEditMode,
  codeListNames,
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
