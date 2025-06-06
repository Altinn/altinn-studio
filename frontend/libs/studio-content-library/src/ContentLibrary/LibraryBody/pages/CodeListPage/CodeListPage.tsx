import React, { useCallback, useMemo, useState } from 'react';
import type { CodeList, TextResource } from '@studio/components-legacy';
import { StudioHeading } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import { CodeLists } from './CodeLists';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import classes from './CodeListPage.module.css';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import type { CodeListReference } from './types/CodeListReference';
import {
  filterCodeLists,
  getTextResourcesForLanguage,
  createTextResourceWithLanguage,
} from './utils';
import type { TextResourceWithLanguage } from '../../../../types/TextResourceWithLanguage';
import type { TextResources } from '../../../../types/TextResources';
import type { CodeListWithMetadata } from './types/CodeListWithMetadata';
import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { InfoBox } from '../../InfoBox';

export type CodeListData = {
  title: string;
  data?: CodeList;
  hasError?: boolean;
};

export type CodeListPageProps = {
  codeListDataList: CodeListData[];
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onCreateTextResource?: (textResource: TextResourceWithLanguage) => void;
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUpdateTextResource?: (textResource: TextResourceWithLanguage) => void;
  onUploadCodeList: (uploadedCodeList: File) => void;
  codeListsUsages?: CodeListReference[];
  textResources?: TextResources;
  externalResources?: ExternalResource[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function CodeListPage({
  codeListDataList,
  onCreateCodeList,
  onCreateTextResource,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUpdateTextResource,
  onUploadCodeList,
  codeListsUsages,
  textResources,
  externalResources,
  onImportCodeListFromOrg,
}: CodeListPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [searchString, setSearchString] = useState<string>('');
  const [codeListInEditMode, setCodeListInEditMode] = useState<string>(undefined);

  const codeListIsEmpty: boolean = codeListDataList.length === 0;

  const filteredCodeLists: CodeListData[] = useMemo(
    () => filterCodeLists(codeListDataList, searchString),
    [codeListDataList, searchString],
  );

  const textResourcesForLanguage = useMemo(
    () => getTextResourcesForLanguage(language, textResources),
    [textResources],
  );

  const handleCreateTextResource = useCallback(
    (textResource: TextResource) => {
      const updatedTextResource = createTextResourceWithLanguage(language, textResource);
      onCreateTextResource?.(updatedTextResource);
    },
    [onCreateTextResource],
  );

  const handleUpdateTextResource = useCallback(
    (textResource: TextResource) => {
      const updatedTextResource = createTextResourceWithLanguage(language, textResource);
      onUpdateTextResource?.(updatedTextResource);
    },
    [onUpdateTextResource],
  );

  const codeListTitles = ArrayUtils.mapByKey<CodeListData, 'title'>(codeListDataList, 'title');

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
      <CodeListsCounterMessage codeListsCount={codeListDataList.length} />
      <CodeListsActionsBar
        onCreateCodeList={onCreateCodeList}
        onCreateTextResource={handleCreateTextResource}
        onUpdateTextResource={handleUpdateTextResource}
        onUploadCodeList={handleUploadCodeList}
        codeListNames={codeListTitles}
        onSetSearchString={setSearchString}
        textResources={textResourcesForLanguage}
        externalResources={externalResources}
        onImportCodeListFromOrg={onImportCodeListFromOrg}
      />
      <CodeLists
        codeListDataList={filteredCodeLists}
        onCreateTextResource={handleCreateTextResource}
        onDeleteCodeList={onDeleteCodeList}
        onUpdateCodeListId={handleUpdateCodeListId}
        onUpdateCodeList={onUpdateCodeList}
        onUpdateTextResource={handleUpdateTextResource}
        codeListInEditMode={codeListInEditMode}
        codeListNames={codeListTitles}
        codeListsUsages={codeListsUsages}
        textResources={textResourcesForLanguage}
      />
      {codeListIsEmpty && <InfoBox pageName='codeList' />}
    </div>
  );
}

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572
