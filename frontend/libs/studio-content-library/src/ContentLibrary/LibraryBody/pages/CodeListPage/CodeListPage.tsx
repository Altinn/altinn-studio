import React, { useCallback, useState } from 'react';
import { StudioHeading, StudioPageError } from '@studio/components';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeListPage.module.css';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';

export type CodeListWithMetadata = {
  codeList: StudioComponentCodeList;
  title: string;
};

export type CodeListPageProps = {
  codeLists: CodeListWithMetadata[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  fetchDataError: boolean;
};
export function CodeListPage({
  codeLists,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUploadCodeList,
  fetchDataError,
}: CodeListPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [codeListInEditMode, setCodeListInEditMode] = useState<string>(undefined);
  const [codeListsSearchMatch, setCodeListsSearchMatch] =
    useState<CodeListWithMetadata[]>(codeLists);

  const handleSearchCodeLists = useCallback(
    (codeListPatternMatch: string) => {
      const filteredCodeLists = getCodeListsSearchMatch(codeLists, codeListPatternMatch);
      setCodeListsSearchMatch(filteredCodeLists);
    },
    [codeLists, setCodeListsSearchMatch],
  );

  if (fetchDataError)
    return <StudioPageError message={t('app_content_library.code_lists.fetch_error')} />;

  const codeListTitles = ArrayUtils.mapByKey<CodeListWithMetadata, 'title'>(codeLists, 'title');

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
      <CodeListsCounterMessage codeListsCount={codeLists.length} />
      <CodeListsActionsBar
        onUploadCodeList={handleUploadCodeList}
        onUpdateCodeList={onUpdateCodeList}
        codeListNames={codeListTitles}
        onHandleSearchCodeLists={handleSearchCodeLists}
      />
      <CodeLists
        codeLists={codeListsSearchMatch}
        onUpdateCodeListId={handleUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListTitles}
      />
    </div>
  );
}

const escapeRegExp = (pattern: string): string => {
  return pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
};

const getCodeListsSearchMatch = (
  codeLists: CodeListWithMetadata[],
  codeListPatternMatch: string,
): CodeListWithMetadata[] => {
  const safePattern = escapeRegExp(codeListPatternMatch);
  const regex = new RegExp(safePattern, 'i');
  return codeLists.filter((codeList) => regex.test(codeList.title));
};
