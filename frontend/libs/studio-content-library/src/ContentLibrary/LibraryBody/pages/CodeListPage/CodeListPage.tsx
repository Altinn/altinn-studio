import React, { useCallback, useState } from 'react';
import { StudioHeading } from '@studio/components';
import type { CodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeListPage.module.css';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import type { CodeListReference } from './types/CodeListReference';

export type CodeListWithMetadata = {
  codeList: CodeList;
  title: string;
};

export type CodeListData = {
  title: string;
  data?: CodeList;
  hasError?: boolean;
};

export type CodeListPageProps = {
  codeListsData: CodeListData[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  codeListsUsages: CodeListReference[];
};

export function CodeListPage({
  codeListsData,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUploadCodeList,
  codeListsUsages,
}: CodeListPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [codeListInEditMode, setCodeListInEditMode] = useState<string>(undefined);
  const [codeListsSearchMatch, setCodeListsSearchMatch] =
    useState<CodeListWithMetadata[]>(codeListsData);

  const handleSearchCodeLists = useCallback(
    (codeListPatternMatch: string) => {
      if (codeListPatternMatch === '*') {
        setCodeListsSearchMatch(codeListsData);
        return;
      }
      const filteredCodeLists = getCodeListsSearchMatch(codeListsData, codeListPatternMatch);
      setCodeListsSearchMatch(filteredCodeLists);
    },
    [codeListsData, setCodeListsSearchMatch],
  );

  const codeListTitles = ArrayUtils.mapByKey<CodeListData, 'title'>(codeListsData, 'title');

  const handleUploadCodeList = (uploadedCodeList: File) => {
    setCodeListInEditMode(FileNameUtils.removeExtension(uploadedCodeList.name));
    onUploadCodeList(uploadedCodeList);
  };

  const handleUpdateCodeListId = (codeListId: string, newCodeListId: string) => {
    setCodeListInEditMode(newCodeListId);
    onUpdateCodeListId(codeListId, newCodeListId);
  };

  return (
    <div className={classes.codeListsContainer}>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <CodeListsCounterMessage codeListsCount={codeListsData.length} />
      <CodeListsActionsBar
        onUploadCodeList={handleUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        codeListNames={codeListTitles}
        codeLists={codeListsData}
        onSetCodeListsSearchMatch={setCodeListsSearchMatch}
        onHandleSearchCodeLists={handleSearchCodeLists}
      />
      <CodeLists
        codeListsData={codeListsSearchMatch}
        onUpdateCodeListId={handleUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListTitles}
        codeListsUsages={codeListsUsages}
      />
    </div>
  );
}

const escapeRegExp = (pattern: string): string => {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getCodeListsSearchMatch = (
  codeLists: CodeListWithMetadata[],
  codeListPatternMatch: string,
): CodeListWithMetadata[] => {
  const safePattern = escapeRegExp(codeListPatternMatch);
  const regex = new RegExp(safePattern, 'i');
  return codeLists.filter((codeList) => regex.test(codeList.title));
};
