import React, { forwardRef, useState } from 'react';
import type { RefObject, ReactElement } from 'react';
import { StudioCodeListEditor, StudioTextfield } from '@studio/components-legacy';
import type { CodeList, CodeListEditorTexts, TextResource } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useCodeListEditorTexts } from '../../../hooks/useCodeListEditorTexts';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import classes from './CreateNewCodeListDialog.module.css';
import type { CodeListWithMetadata } from '../../../types/CodeListWithMetadata';
import { FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../../hooks/useInputCodeListNameErrorMessage';
import { StudioDialog, StudioHeading, StudioButton } from '@studio/components';

export type CreateNewCodeListDialogProps = {
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onCreateTextResource?: (textResource: TextResource) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  codeListNames: string[];
  textResources: TextResource[];
};

function CreateNewCodeListDialog(
  {
    onCreateCodeList,
    onCreateTextResource,
    onUpdateTextResource,
    codeListNames,
    textResources,
  }: CreateNewCodeListDialogProps,
  ref: RefObject<HTMLDialogElement>,
): ReactElement {
  const { t } = useTranslation();
  const newCodeList: CodeList = [];

  const handleCloseDialog = () => {
    ref.current?.close();
  };

  return (
    <StudioDialog
      closedby='any'
      ref={ref}
      onClose={handleCloseDialog}
      className={classes.createNewCodeListDialog}
    >
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('app_content_library.code_lists.create_new_code_list_modal_title')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <CreateNewCodeList
          codeList={newCodeList}
          codeListNames={codeListNames}
          onCreateCodeList={onCreateCodeList}
          onCreateTextResource={onCreateTextResource}
          onCloseModal={handleCloseDialog}
          onUpdateTextResource={onUpdateTextResource}
          textResources={textResources}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
}

const ForwardedCreateNewCodeListDialog = forwardRef(CreateNewCodeListDialog);

export { ForwardedCreateNewCodeListDialog as CreateNewCodeListDialog };

type CreateNewCodeListProps = {
  codeList: CodeList;
  codeListNames: string[];
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onCreateTextResource?: (textResource: TextResource) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  onCloseModal: () => void;
  textResources: TextResource[];
};

function CreateNewCodeList({
  codeList,
  codeListNames,
  onCreateCodeList,
  onCreateTextResource,
  onUpdateTextResource,
  onCloseModal,
  textResources,
}: CreateNewCodeListProps) {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
  const [isCodeListValid, setIsCodeListValid] = useState<boolean>(true);
  const [codeListTitleError, setCodeListTitleError] = useState<string>('');
  const initialCodeListWithMetadata: CodeListWithMetadata = {
    title: '',
    codeList,
  };
  const [currentCodeListWithMetadata, setCurrentCodeListWithMetadata] =
    useState<CodeListWithMetadata>(initialCodeListWithMetadata);

  const handleSaveCodeList = () => {
    onCreateCodeList(currentCodeListWithMetadata);
    onCloseModal();
    setCurrentCodeListWithMetadata(initialCodeListWithMetadata);
  };

  const handleCodeListTitleChange = (updatedTitle: string) => {
    const fileNameError = FileNameUtils.findFileNameError(updatedTitle, codeListNames);
    const errorMessage = getInvalidInputFileNameErrorMessage(fileNameError);
    setCodeListTitleError(errorMessage ?? '');
    if (!fileNameError) {
      const updatedCodeListWithMetadata = updateTitleInCodeListWithMetadata(
        currentCodeListWithMetadata,
        updatedTitle,
      );
      setCurrentCodeListWithMetadata(updatedCodeListWithMetadata);
    }
  };

  const handleUpdateCodeList = (updatedCodeList: CodeList) => {
    setIsCodeListValid(true);
    const updatedCodeListWithMetadata = updateCodeListInCodeListWithMetadata(
      currentCodeListWithMetadata,
      updatedCodeList,
    );
    setCurrentCodeListWithMetadata(updatedCodeListWithMetadata);
  };

  const handleInvalidCodeList = () => {
    setIsCodeListValid(false);
  };

  const shouldSaveButtonBeDisabled: boolean =
    !isCodeListValid || !currentCodeListWithMetadata.title || !!codeListTitleError;

  return (
    <div className={classes.createNewCodeList}>
      <StudioTextfield
        label={t('app_content_library.code_lists.create_new_code_list_name')}
        className={classes.codeListTitle}
        onChange={(event) => handleCodeListTitleChange(event.target.value)}
        error={codeListTitleError}
      />
      <div className={classes.codeListEditor}>
        <StudioCodeListEditor
          codeList={currentCodeListWithMetadata.codeList}
          onCreateTextResource={onCreateTextResource}
          onInvalid={handleInvalidCodeList}
          onUpdateCodeList={handleUpdateCodeList}
          onUpdateTextResource={onUpdateTextResource}
          texts={editorTexts}
          textResources={textResources}
        />
      </div>
      <div className={classes.buttonWrapper}>
        <StudioButton
          title={t('general.save')}
          icon={<CheckmarkIcon />}
          onClick={handleSaveCodeList}
          disabled={shouldSaveButtonBeDisabled}
        >
          {t('general.save')}
        </StudioButton>
        <StudioButton
          onClick={onCloseModal}
          title={t('general.cancel')}
          icon={<XMarkIcon />}
          variant='secondary'
        >
          {t('general.cancel')}
        </StudioButton>
      </div>
    </div>
  );
}

const updateCodeListInCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: CodeList,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};

const updateTitleInCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedTitle: string,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, title: updatedTitle };
};
