import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioParagraph,
} from '@studio/components';
import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  validateCodeListMap,
  updateCodeListFileInMap,
  areFileMapsEqual,
} from './utils';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListData } from '../../../types/CodeListData';
import classes from './CodeListsPage.module.css';
import { FloppydiskIcon, PlusIcon } from '@studio/icons';
import type { CodeListMapError } from './types/CodeListMapError';
import { Errors } from './Errors';
import type { CodeListFile } from '../../../types/CodeListFile';
import type { CodeListFileMap } from './types/CodeListFileMap';
import { Link } from '@digdir/designsystemet-react';
import { useRouterContext } from '../../../ContentLibrary/RouterContext';

export type CodeListsPageProps = {
  codeLists: CodeListFile[];
  isPublishing: (fileName: string) => boolean;
  publishedCodeLists: string[];
  onPublish: (data: CodeListData) => void;
  onSave: (data: CodeListFile[]) => Promise<void>;
};

type SaveState = 'ok' | 'pending' | 'error';

export function CodeListsPage({
  codeLists,
  isPublishing,
  onPublish,
  onSave,
  publishedCodeLists,
}: CodeListsPageProps): ReactElement {
  const { t } = useTranslation();
  const [savedMap, setSavedMap] = useState(createCodeListMap(codeLists));
  const [codeListMap, setCodeListMap] = useState<CodeListFileMap>(savedMap);
  const [saveState, setSaveState] = useState<SaveState>('ok');
  const isSaved = areFileMapsEqual(savedMap, codeListMap);

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
      setSaveState('pending');
      onSave(updatedCodeListFiles)
        .then(() => {
          setSavedMap(codeListMap);
          setSaveState('ok');
        })
        .catch((error: unknown) => {
          setSaveState('error');
          console.error(error);
        });
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
        currentCodeListMap={codeListMap}
        isPublishing={isPublishing}
        onDeleteCodeList={handleDeleteCodeList}
        onPublish={onPublish}
        onUpdateCodeListFile={handleUpdateCodeListFile}
        publishedCodeLists={publishedCodeLists}
        savedCodeListMap={savedMap}
      />
      <Errors errors={errors} />
      <Save isSaved={isSaved} state={saveState} onSave={handleSave} />
    </div>
  );
}

type ListOfCodeListsProps = Readonly<{
  currentCodeListMap: CodeListFileMap;
  isPublishing: (fileName: string) => boolean;
  onDeleteCodeList: (key: string) => void;
  onPublish: (data: CodeListData) => void;
  onUpdateCodeListFile: (key: string, newFile: CodeListFile) => void;
  publishedCodeLists: string[];
  savedCodeListMap: CodeListFileMap;
}>;

function ListOfCodeLists({
  currentCodeListMap,
  isPublishing,
  onDeleteCodeList,
  onPublish,
  onUpdateCodeListFile,
  publishedCodeLists,
  savedCodeListMap,
}: ListOfCodeListsProps): ReactElement {
  const { t } = useTranslation();
  const isEmpty = currentCodeListMap.size === 0;

  if (isEmpty) {
    return <StudioParagraph>{t('app_content_library.code_lists.empty')}</StudioParagraph>;
  } else {
    return (
      <StudioCard>
        {[...currentCodeListMap].map(([key, file]) => (
          <CodeListDataEditor
            currentFile={file}
            savedFile={savedCodeListMap.get(key) || null}
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

type SaveProps = {
  state: SaveState;
  isSaved: boolean;
  onSave: React.MouseEventHandler<HTMLButtonElement>;
};

function Save({ isSaved, state, onSave }: SaveProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <StudioAlert data-color={state === 'error' ? 'danger' : isSaved ? 'success' : 'info'}>
      <StudioParagraph>
        <SaveMessage state={state} isSaved={isSaved} />
      </StudioParagraph>
      {!isSaved && (
        <StudioButton
          className={classes.saveButton}
          data-color='success'
          icon={<FloppydiskIcon />}
          loading={state === 'pending'}
          onClick={onSave}
        >
          {t('general.save')}
        </StudioButton>
      )}
    </StudioAlert>
  );
}

type SaveMessageProps = {
  state: SaveState;
  isSaved: boolean;
};

function SaveMessage({ state, isSaved }: SaveMessageProps): React.ReactNode {
  const { t } = useTranslation();
  const { contactPagePath } = useRouterContext();
  switch (state) {
    case 'ok':
      return isSaved
        ? t('app_content_library.code_lists.save.no_unsaved_changes')
        : t('app_content_library.code_lists.save.unsaved_changes');
    case 'pending':
      return t('app_content_library.code_lists.save.pending');
    case 'error':
      return (
        <Trans
          i18nKey='app_content_library.code_lists.save.error'
          components={{ a: <Link href={contactPagePath}>{null}</Link> }}
        />
      );
  }
}
