import React, { useState } from 'react';
import { StudioHeading, StudioPageError } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeList.module.css';
import { FileNameUtils } from '@studio/pure-functions';

export type CodeListWithMetadata = {
  codeList: StudioComponentCodeList;
  title: string;
};

export type CodeListProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  fetchDataError: boolean;
};
export function CodeList({
  codeLists,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUploadCodeList,
  fetchDataError,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();
  const [codeListInEditMode, setCodeListInEditMode] = useState<string>(undefined);

  if (fetchDataError)
    return <StudioPageError message={t('app_content_library.code_lists.fetch_error')} />;

  const handleUploadCodeList = (uploadedCodeList: File) => {
    onUploadCodeList(uploadedCodeList);
    setCodeListInEditMode(FileNameUtils.removeExtension(uploadedCodeList.name));
  };

  const handleUpdateCodeListId = (codeListId: string, newCodeListId: string) => {
    setCodeListInEditMode(newCodeListId);
    onUpdateCodeListId(codeListId, newCodeListId);
  };

  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeLists.length} />
      <CodeListsActionsBar
        onUploadCodeList={handleUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
      />
      <CodeLists
        codeLists={codeLists}
        onUpdateCodeListId={handleUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
      />
    </div>
  );
}
