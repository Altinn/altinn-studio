import React from 'react';
import { StudioHeading } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeList.module.css';
import { ArrayUtils } from '@studio/pure-functions';

export type CodeListWithMetadata = {
  data: StudioComponentCodeList;
  title: string;
};

export type CodeListData = {
  title: string;
  data?: StudioComponentCodeList;
  hasError?: boolean;
};

export type CodeListProps = {
  codeListsData: CodeListData[];
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
};
export function CodeList({
  codeListsData,
  onUpdateCodeList,
  onUploadCodeList,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();

  const codeListTitles = ArrayUtils.mapByKey<CodeListData, 'title'>(codeListsData, 'title');

  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeListsData.length} />
      <CodeListsActionsBar
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        codeListNames={codeListTitles}
      />
      <CodeLists codeListsData={codeListsData} onUpdateCodeList={onUpdateCodeList} />
    </div>
  );
}
