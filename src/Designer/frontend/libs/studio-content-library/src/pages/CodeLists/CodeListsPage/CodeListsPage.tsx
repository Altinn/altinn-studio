import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioHeading, StudioParagraph } from '@studio/components';
import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  validateCodeListMap,
  updateCodeListFileInMap,
} from './utils';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListData } from '../../../types/CodeListData';
import classes from './CodeListsPage.module.css';
import { FloppydiskIcon, PlusIcon } from '@studio/icons';
import type { CodeListMapError } from './types/CodeListMapError';
import { Errors } from './Errors';
import { CodeListFile } from '../../../types/CodeListFile';
import { CodeListFileMap } from './types/CodeListFileMap';

export type CodeListsPageProps = {
  codeLists: CodeListFile[];
  isPublishing: (codeListName: string) => boolean;
  publishedCodeLists: string[];
  onPublish: (data: CodeListData) => void;
  onSave: (data: CodeListFile[]) => void;
};

export function CodeListsPage({
  codeLists,
  isPublishing,
  onPublish,
  onSave,
  publishedCodeLists,
}: CodeListsPageProps): ReactElement {
  const { t } = useTranslation();
  const [codeListMap, setCodeListMap] = useState<CodeListFileMap>(createCodeListMap(codeLists));
  const [errors, setErrors] = useState<CodeListMapError[]>([]);

  const handleUpdateCodeListFile = useCallback(
    (key: string, newFile: CodeListFile): void => {
      const newCodeListMap = updateCodeListFileInMap(codeListMap, key, newFile);
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
      const updatedCodeListFiles: CodeListFile[] = [...codeListMap.values()];
      onSave(updatedCodeListFiles);
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
        onUpdateCodeListFile={handleUpdateCodeListFile}
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
  codeListMap: CodeListFileMap;
  isPublishing: (codeListName: string) => boolean;
  onDeleteCodeList: (key: string) => void;
  onPublish: (data: CodeListData) => void;
  onUpdateCodeListFile: (key: string, newFile: CodeListFile) => void;
  publishedCodeLists: string[];
}>;

function ListOfCodeLists({
  codeListMap,
  isPublishing,
  onDeleteCodeList,
  onPublish,
  onUpdateCodeListFile,
  publishedCodeLists,
}: ListOfCodeListsProps): ReactElement {
  const { t } = useTranslation();
  const isEmpty = codeListMap.size === 0;

  if (isEmpty) {
    return <StudioParagraph>{t('app_content_library.code_lists.empty')}</StudioParagraph>;
  } else {
    return (
      <StudioCard>
        {[...codeListMap].map(([key, file]) => (
          <CodeListDataEditor
            file={file}
            isPublishing={isPublishing(file.name)}
            key={key}
            onDelete={() => onDeleteCodeList(key)}
            onPublish={onPublish}
            onUpdate={(newData) => onUpdateCodeListFile(key, newData)}
            publishedCodeLists={publishedCodeLists}
          />
        ))}
      </StudioCard>
    );
  }
}
