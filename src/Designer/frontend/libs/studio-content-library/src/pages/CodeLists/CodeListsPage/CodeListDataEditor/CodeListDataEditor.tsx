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
  CodeListParseError,
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
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';

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
  onDelete,
  onUpdate,
  ...rest
}: OrdinaryFileEditorContentProps): React.ReactElement {
  const { t } = useTranslation();

  const name = useMemo(() => getCodeListNameFromFile(currentFile), [currentFile]);

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { value } = event.target;
      const newFile = updateName<OrdinaryCodeListFile>(currentFile, value);
      onUpdate(newFile);
    },
    [currentFile, onUpdate],
  );

  return (
    <StudioDetails.Content className={classes.content}>
      <StudioTextfield
        className={classes.nameField}
        label={t('app_content_library.code_lists.name')}
        onChange={handleNameChange}
        value={name}
      />
      <StudioDeleteButton className={classes.deleteButton} onDelete={onDelete}>
        {t('general.delete')}
      </StudioDeleteButton>
      <ErrorBoundary FallbackComponent={ParseErrorFallback}>
        <DataView currentFile={currentFile} onUpdate={onUpdate} {...rest} />
      </ErrorBoundary>
    </StudioDetails.Content>
  );
}

function ParseErrorFallback({ error }: FallbackProps): React.ReactElement {
  const parseErrorMessage = useParseErrorMessage();
  /* istanbul ignore else */
  if (error instanceof CodeListParseError) {
    return (
      <StudioAlert data-color='danger' className={classes.error}>
        {parseErrorMessage(error)}
      </StudioAlert>
    );
  } else throw error;
}

function useParseErrorMessage(): (error: CodeListParseError) => string {
  const { t } = useTranslation();
  return (error: CodeListParseError): string => {
    switch (error.code) {
      case 'invalid-json-syntax':
        return t('app_content_library.code_lists.parse_error.invalid_json_syntax');
      case 'invalid-code-list':
        return t('app_content_library.code_lists.parse_error.invalid_code_list');
    }
  };
}

type DataViewProps = Omit<OrdinaryFileEditorContentProps, 'onDelete'>;

function DataView({
  currentFile,
  isPublishing,
  onPublish,
  onUpdate,
  publishedCodeLists,
}: DataViewProps): React.ReactElement {
  const texts = useCodeListEditorTexts();
  const data = useMemo<CodeListData>(() => codeListFileToData(currentFile), [currentFile]);

  const handleCodeListUpdate = useCallback(
    (newCodeList: CodeList): void => {
      const newFile = updateCodes(currentFile, newCodeList);
      onUpdate(newFile);
    },
    [currentFile, onUpdate],
  );

  const handlePublish = useCallback((): void => onPublish(data), [data, onPublish]);

  return (
    <>
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
    </>
  );
}

function BackendError(): React.ReactElement {
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
