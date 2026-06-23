import React, { useCallback, useMemo } from 'react';
import type { ChangeEventHandler, ReactElement, ReactNode } from 'react';
import { useCodeListEditorTexts } from '../useCodeListEditorTexts';
import {
  StudioAlert,
  StudioCodeListEditor,
  StudioDeleteButton,
  StudioDetails,
  StudioLink,
  StudioTextfield,
} from '@studio/components';
import type { CodeList } from '../../../../types/CodeList';
import type { CodeListData } from '../../../../types/CodeListData';
import {
  codeListFileToData,
  fileState,
  getCodeListNameFromFile,
  hasContent,
  updateCodes,
  updateName,
} from './utils';
import type { FileState } from './utils';
import { Trans, useTranslation } from 'react-i18next';
import classes from './CodeListDataEditor.module.css';
import { Publishing } from './Publishing';
import type { CodeListFile, OrdinaryCodeListFile } from '../../../../types/CodeListFile';
import cn from 'classnames';
import { useRouterContext } from '../../../../ContentLibrary/RouterContext';

export type CodeListDataEditorProps<FileInfo = CodeListFile> = Readonly<{
  currentFile: FileInfo;
  isPublishing: boolean;
  onDelete: () => void;
  onPublish: (data: CodeListData) => void;
  onUpdate: (newFile: OrdinaryCodeListFile) => void;
  publishedCodeLists: string[];
  savedFile: FileInfo | null;
}>;

export function CodeListDataEditor({
  currentFile,
  savedFile,
  ...rest
}: CodeListDataEditorProps): ReactElement {
  const name = getCodeListNameFromFile(currentFile);

  const state = useMemo<FileState>(
    () => fileState(currentFile, savedFile),
    [currentFile, savedFile],
  );

  return (
    <StudioDetails>
      <StudioDetails.Summary className={cn(classes.summary, fileStateToClassMap[state])}>
        <Name name={name} />
      </StudioDetails.Summary>
      {hasContent(currentFile) ? (
        <OrdinaryFileEditorContent currentFile={currentFile} {...rest} />
      ) : (
        <BackendError />
      )}
    </StudioDetails>
  );
}

const DEFAULT_LANGUAGE = 'nb';

function Name({ name }: Readonly<{ name: string }>): ReactNode {
  const { t } = useTranslation();
  if (name) return name;
  else
    return <span className={classes.unnamed}>{t('app_content_library.code_lists.unnamed')}</span>;
}

const fileStateToClassMap: Record<FileState, string | null> = {
  added: classes.added,
  changed: classes.changed,
  saved: null,
  withProblem: null,
};

type OrdinaryFileEditorContentProps = Omit<
  CodeListDataEditorProps<OrdinaryCodeListFile>,
  'savedFile'
>;

function OrdinaryFileEditorContent({
  currentFile,
  isPublishing,
  onDelete,
  onPublish,
  onUpdate,
  publishedCodeLists,
}: OrdinaryFileEditorContentProps): ReactElement {
  const texts = useCodeListEditorTexts();
  const { t } = useTranslation();

  const data = useMemo<CodeListData>(() => codeListFileToData(currentFile), [currentFile]);

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { value } = event.target;
      const newFile = updateName<OrdinaryCodeListFile>(currentFile, value);
      onUpdate(newFile);
    },
    [currentFile, onUpdate],
  );

  const handleCodeListUpdate = useCallback(
    (newCodeList: CodeList): void => {
      const newFile = updateCodes(currentFile, newCodeList);
      onUpdate(newFile);
    },
    [currentFile, onUpdate],
  );

  const handlePublish = useCallback((): void => onPublish(data), [data, onPublish]);
  return (
    <StudioDetails.Content className={classes.content}>
      <StudioTextfield
        className={classes.nameField}
        label={t('app_content_library.code_lists.name')}
        onChange={handleNameChange}
        value={data.name}
      />
      <StudioDeleteButton className={classes.deleteButton} onDelete={onDelete}>
        {t('general.delete')}
      </StudioDeleteButton>
      <Publishing
        className={classes.publishing}
        codeListName={data.name}
        isPending={isPublishing}
        onPublish={handlePublish}
        publishedCodeLists={publishedCodeLists}
      />
      <StudioCodeListEditor
        className={classes.codes}
        codeList={data.codes}
        fallbackLanguage={DEFAULT_LANGUAGE}
        onUpdateCodeList={handleCodeListUpdate}
        texts={texts}
      />
    </StudioDetails.Content>
  );
}

function BackendError(): ReactElement {
  const { contactPagePath } = useRouterContext();
  return (
    <StudioDetails.Content>
      <StudioAlert data-color='danger'>
        <Trans
          i18nKey='app_content_library.code_lists.backend_error'
          components={{ a: <StudioLink href={contactPagePath}>{null}</StudioLink> }}
        />
      </StudioAlert>
    </StudioDetails.Content>
  );
}
