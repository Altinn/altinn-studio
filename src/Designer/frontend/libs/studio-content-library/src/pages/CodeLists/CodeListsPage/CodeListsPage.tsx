import React, { useCallback, useState } from 'react';
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
  isPublishing: (codeListName: string) => boolean;
  publishedCodeLists: string[];
  onPublish: (data: CodeListData) => void;
  onSave: (data: CodeListData[]) => void;
};

export function CodeListsPage({
  codeLists,
  isPublishing,
  onPublish,
  onSave,
  publishedCodeLists,
}: CodeListsPageProps): ReactElement {
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
        isPublishing={isPublishing}
        onDeleteCodeList={handleDeleteCodeList}
        onPublish={onPublish}
        onUpdateCodeListData={handleUpdateCodeListData}
        publishedCodeLists={publishedCodeLists}
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
  isPublishing: (codeListName: string) => boolean;
  onDeleteCodeList: (key: string) => void;
  onPublish: (data: CodeListData) => void;
  onUpdateCodeListData: (key: string, newData: CodeListData) => void;
  publishedCodeLists: string[];
}>;

function ListOfCodeLists({
  codeListMap,
  isPublishing,
  onDeleteCodeList,
  onPublish,
  onUpdateCodeListData,
  publishedCodeLists,
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
            isPublishing={isPublishing(data.name)}
            key={key}
            onDelete={() => onDeleteCodeList(key)}
            onPublish={onPublish}
            onUpdate={(newData) => onUpdateCodeListData(key, newData)}
            publishedCodeLists={publishedCodeLists}
          />
        ))}
      </StudioCard>
    );
  }
}
