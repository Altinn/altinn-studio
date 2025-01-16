import React, { useMemo, useState } from 'react';
import { StudioHeading } from '@studio/components';
import type { CodeList } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeListPage.module.css';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import type { CodeListReference } from './types/CodeListReference';
import { filterCodeLists } from './utils/codeListPageUtils';

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
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  codeListsUsages: CodeListReference[];
};

export function CodeListPage({
  codeListsData,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUploadCodeList,
  codeListsUsages,
}: CodeListPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [searchString, setSearchString] = useState<string>('');
  const [codeListInEditMode, setCodeListInEditMode] = useState<string>(undefined);

  const filteredCodeLists: CodeListData[] = useMemo(
    () => filterCodeLists(codeListsData, searchString),
    [codeListsData, searchString],
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
        onSetSearchString={setSearchString}
      />
      <CodeLists
        codeListsData={filteredCodeLists}
        onDeleteCodeList={onDeleteCodeList}
        onUpdateCodeListId={handleUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListTitles}
        codeListsUsages={codeListsUsages}
      />
    </div>
  );
}
