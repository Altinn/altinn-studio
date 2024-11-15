import React from 'react';
import { StudioHeading, StudioPageError } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeListPage.module.css';
import { ArrayUtils } from '@studio/pure-functions';

export type CodeListWithMetadata = {
  codeList: StudioComponentCodeList;
  title: string;
};

export type CodeListPageProps = {
  codeLists: CodeListWithMetadata[];
  onChangeCodeListId: (title: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  fetchDataError: boolean;
};
export function CodeListPage({
  codeLists,
  onChangeCodeListId,
  onUpdateCodeList,
  onUploadCodeList,
  fetchDataError,
}: CodeListPageProps): React.ReactElement {
  const { t } = useTranslation();

  if (fetchDataError)
    return <StudioPageError message={t('app_content_library.code_lists.fetch_error')} />;

  const codeListTitles = ArrayUtils.mapByKey<CodeListWithMetadata, 'title'>(codeLists, 'title');

  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeLists.length} />
      <CodeListsActionsBar
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        codeListNames={codeListTitles}
      />
      <CodeLists 
        codeLists={codeLists} 
        onChangeCodeListId={onChangeCodeListId} 
        onUpdateCodeList={onUpdateCodeList} />
    </div>
  );
}
