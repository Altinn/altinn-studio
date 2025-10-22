import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading } from '@studio/components';
import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListDataInMap,
} from './utils';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListMap } from './types/CodeListMap';
import type { CodeListData } from './types/CodeListData';

export type CodeListsPageProps = {};

export function CodeListsPage({}: CodeListsPageProps): ReactElement {
  const { t } = useTranslation();
  const [codeListMap, setCodeListMap] = useState<CodeListMap>(createCodeListMap());

  const handleUpdateCodeListData = useCallback(
    (key: string, newData: CodeListData): void => {
      const newCodeListMap = updateCodeListDataInMap(codeListMap, key, newData);
      setCodeListMap(newCodeListMap);
    },
    [codeListMap, setCodeListMap],
  );

  const handleAddCodeList = useCallback((): void => {
    const newCodeListMap = addCodeListToMap(codeListMap);
    setCodeListMap(newCodeListMap);
  }, [codeListMap, setCodeListMap]);

  const handleDeleteCodeList = useCallback(
    (key: string): void => {
      const newCodeListMap = deleteCodeListFromMap(codeListMap, key);
      setCodeListMap(newCodeListMap);
    },
    [codeListMap, setCodeListMap],
  );

  return (
    <>
      <StudioHeading>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <StudioButton onClick={handleAddCodeList}>{t('general.add')}</StudioButton>
      {Array(...codeListMap).map(([key, data]) => (
        <CodeListDataEditor
          data={data}
          key={key}
          onUpdate={(newData) => handleUpdateCodeListData(key, newData)}
          onDelete={() => handleDeleteCodeList(key)}
        />
      ))}
    </>
  );
}
