import React from 'react';
import { StudioCodeListEditor } from '@studio/components';
import type { CodeList as StudioComponentsCodeList, CodeListEditorTexts } from '@studio/components';
import { useOptionListEditorTexts } from '../hooks/useCodeListEditorTexts';
import type { CodeListData, CodeListWithMetadata } from '../CodeList';
import { Accordion, Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export type CodeListsProps = {
  codeListsData: CodeListData[];
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeLists({ codeListsData, onUpdateCodeList }: CodeListsProps) {
  return codeListsData.map((codeListData) => (
    <CodeList
      key={codeListData.title}
      codeListData={codeListData}
      onUpdateCodeList={onUpdateCodeList}
    />
  ));
}

type CodeListProps = {
  codeListData: CodeListData;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

function CodeList({ codeListData, onUpdateCodeList }: CodeListProps) {
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const { t } = useTranslation();

  const handleUpdateCodeList = (updatedCodeList: StudioComponentsCodeList): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListData.title, data: codeListData.data },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeListData.title}</Accordion.Header>
        <Accordion.Content>
          {codeListData.hasError ? (
            <Alert size='small' severity='danger'>
              {t('app_content_library.code_lists.fetch_error')}
            </Alert>
          ) : (
            <StudioCodeListEditor
              codeList={codeListData.data}
              onChange={handleUpdateCodeList}
              texts={editorTexts}
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
  return { ...currentCodeListWithMetadata, data: updatedCodeList };
};
