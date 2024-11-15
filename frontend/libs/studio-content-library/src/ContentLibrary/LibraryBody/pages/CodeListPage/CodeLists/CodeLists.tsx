import React from 'react';
import type { CodeListWithMetadata } from '../CodeListPage';
import { Accordion } from '@digdir/designsystemet-react';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';
import { EditCodeList } from './EditCodeList/EditCodeList';

export type CodeListsProps = {
  codeLists: CodeListWithMetadata[];
  onChangeCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeLists({ codeLists, onChangeCodeListId, onUpdateCodeList }: CodeListsProps) {
  return codeLists.map((codeList) => (
    <CodeList
      key={codeList.title}
      codeList={codeList}
      onChangeCodeListId={onChangeCodeListId}
      onUpdateCodeList={onUpdateCodeList}
    />
  ));
}

type CodeListProps = {
  codeList: CodeListWithMetadata;
  onChangeCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

function CodeList({ codeList, onUpdateCodeList, onChangeCodeListId }: CodeListProps) {
  return (
    <Accordion border>
      <Accordion.Item>
        <Accordion.Header>{codeList.title}</Accordion.Header>
        <Accordion.Content>
          <EditCodeList
            codeList={codeList}
            onChangeCodeListId={onChangeCodeListId}
            onUpdateCodeList={onUpdateCodeList}
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
