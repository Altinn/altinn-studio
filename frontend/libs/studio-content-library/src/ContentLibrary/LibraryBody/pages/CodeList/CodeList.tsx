import React from 'react';
import { StudioHeading, StudioPageError } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeList.module.css';

export type CodeListWithMetadata = {
  codeList: StudioComponentCodeList;
  title: string;
};

export type CodeListProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  fetchDataError: boolean;
};
export function CodeList({
  codeLists,
  onUpdateCodeList,
  onUploadCodeList,
  fetchDataError,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();

  if (fetchDataError)
    return <StudioPageError message={t('app_content_library.code_lists.fetch_error')} />;

  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeLists.length} />
      <CodeListsActionsBar
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
      />
      <CodeLists codeLists={codeLists} onUpdateCodeList={onUpdateCodeList} />
    </div>
  );
}
