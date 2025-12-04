import React, { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioHeading, StudioParagraph } from '@studio/components';
import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListDataInMap,
  validateCodeListMap,
} from './utils';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListMap } from './types/CodeListMap';
import type { CodeListData } from '../../../types/CodeListData';
import classes from './CodeListsPage.module.css';
import { FloppydiskIcon, PlusIcon } from '@studio/icons';
import type { CodeListMapError } from './types/CodeListMapError';
import { Errors } from './Errors';

export type CodeListsPageProps = {
  codeLists: CodeListData[];
  onSave: (data: CodeListData[]) => void;
};

export function CodeListsPage({ codeLists, onSave }: CodeListsPageProps): ReactElement {
  const { t } = useTranslation();
  const [codeListMap, setCodeListMap] = useState<CodeListMap>(createCodeListMap(codeLists));
  const [errors, setErrors] = useState<CodeListMapError[]>([]);

  const handleUpdateCodeListData = useCallback(
    (key: string, newData: CodeListData): void => {
      const newCodeListMap = updateCodeListDataInMap(codeListMap, key, newData);
      setCodeListMap(newCodeListMap);
    },
    [codeListMap, setCodeListMap],
  );

  useEffect(() => {
    setCodeListMap(createCodeListMap(codeLists));
  }, [codeLists]);

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

  const handleSave: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const validationErrors = validateCodeListMap(codeListMap);
    if (validationErrors.length) {
      setErrors(validationErrors);
    } else {
      setErrors([]);
      const updatedCodeLists: CodeListData[] = [...codeListMap.values()];
      onSave(updatedCodeLists);
    }
  }, [codeListMap, onSave]);

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
      <ListOfCodeLists
        codeListMap={codeListMap}
        onDeleteCodeList={handleDeleteCodeList}
        onUpdateCodeListData={handleUpdateCodeListData}
      />
      <Errors errors={errors} />
      <StudioButton data-color='success' icon={<FloppydiskIcon />} onClick={handleSave}>
        {t('general.save')}
      </StudioButton>
    </div>
  );
}

type ListOfCodeListsProps = Readonly<{
  codeListMap: CodeListMap;
  onDeleteCodeList: (key: string) => void;
  onUpdateCodeListData: (key: string, newData: CodeListData) => void;
}>;

function ListOfCodeLists({
  codeListMap,
  onDeleteCodeList,
  onUpdateCodeListData,
}: ListOfCodeListsProps): ReactElement {
  const { t } = useTranslation();
  const isEmpty = codeListMap.size === 0;

  if (isEmpty) {
    return <StudioParagraph>{t('app_content_library.code_lists.empty')}</StudioParagraph>;
  } else {
    return (
      <StudioCard>
        {[...codeListMap].map(([key, data]) => (
          <CodeListDataEditor
            data={data}
            key={key}
            onDelete={() => onDeleteCodeList(key)}
            onUpdate={(newData) => onUpdateCodeListData(key, newData)}
          />
        ))}
      </StudioCard>
    );
  }
}
