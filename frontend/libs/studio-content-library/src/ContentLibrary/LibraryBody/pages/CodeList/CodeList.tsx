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
  codeList: StudioComponentCodeList;
  title: string;
};

export type OnGetCodeListResult = {
  codeListWithMetadata: CodeListWithMetadata | undefined;
  isError: boolean;
};

export type CodeListProps = {
  codeListIds: string[];
  onGetCodeList: (codeListId: string) => OnGetCodeListResult;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
};
export function CodeList({
  codeListIds,
  onGetCodeList,
  onUpdateCodeList,
  onUploadCodeList,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();

  const codeListTitles = ArrayUtils.mapByKey<CodeListWithMetadata, 'title'>(codeLists, 'title');
  
  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeListIds.length} />
      <CodeListsActionsBar
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        codeListNames={codeListTitles}
      />
      <CodeLists
        codeListIds={codeListIds}
        onGetCodeList={onGetCodeList}
        onUpdateCodeList={onUpdateCodeList}
      />
    </div>
  );
}
