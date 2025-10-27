import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioHeading } from '@studio/components';
import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListDataInMap,
} from './utils';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListMap } from './types/CodeListMap';
import type { CodeListData } from './types/CodeListData';
import classes from './CodeListsPage.module.css';
import { PlusIcon } from '@studio/icons';

export type CodeListsPageProps = {};

export function CodeListsPage(_props: CodeListsPageProps): ReactElement {
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
    <div className={classes.codeListsPage}>
      <StudioHeading>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      <StudioButton
        className={classes.addButton}
        icon={<PlusIcon />}
        onClick={handleAddCodeList}
        variant='secondary'
      >
        {t('general.add')}
      </StudioButton>
      <StudioCard>
        {Array(...codeListMap).map(([key, data]) => (
          <CodeListDataEditor
            data={data}
            key={key}
            onUpdate={(newData) => handleUpdateCodeListData(key, newData)}
            onDelete={() => handleDeleteCodeList(key)}
          />
        ))}
      </StudioCard>
    </div>
  );
}
