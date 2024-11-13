import React from 'react';
import type { CodeListWithMetadata } from '../CodeList';
import { Accordion } from '@digdir/designsystemet-react';
import { StudioCodeListEditor } from '@studio/components';
import type { CodeList as StudioComponentsCodeList, CodeListEditorTexts } from '@studio/components';
import { useOptionListEditorTexts } from '../hooks/useCodeListEditorTexts';

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
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();

  const handleUpdateCodeList = (updatedCodeList: StudioComponentsCodeList) => {
    onUpdateCodeList({ title: codeList.title, codeList: updatedCodeList });
  };

  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeList.title}</Accordion.Header>
        <Accordion.Content>
          <StudioCodeListEditor
            codeList={codeList.codeList}
            onChange={handleUpdateCodeList}
            texts={editorTexts}
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
