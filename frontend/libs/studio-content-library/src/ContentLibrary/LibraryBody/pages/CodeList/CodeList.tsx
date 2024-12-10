import React from 'react';
import { StudioHeading } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeList.module.css';
import type { UseLibraryQuery } from '../../../../types/useLibraryQuery';

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
  getCodeList: UseLibraryQuery<StudioComponentCodeList, string>;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
};
export function CodeList({
  codeListIds,
  getCodeList,
  onUpdateCodeList,
  onUploadCodeList,
}: CodeListProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeListIds.length} />
      <CodeListsActionsBar
        onUploadCodeList={onUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
      />
      <CodeLists
        codeListIds={codeListIds}
        getCodeList={getCodeList}
        onUpdateCodeList={onUpdateCodeList}
      />
    </div>
  );
}
