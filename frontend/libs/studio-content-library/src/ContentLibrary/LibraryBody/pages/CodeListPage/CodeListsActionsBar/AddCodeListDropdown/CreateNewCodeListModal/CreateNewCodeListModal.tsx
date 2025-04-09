import React, { forwardRef, useState } from 'react';
import type { RefObject, ReactElement } from 'react';
import { StudioButton, StudioCodeListEditor, StudioTextfield } from '@studio/components-legacy';
import type { CodeList, CodeListEditorTexts, TextResource } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useCodeListEditorTexts } from '../../../hooks/useCodeListEditorTexts';
import { CheckmarkIcon } from '@studio/icons';
import classes from './CreateNewCodeListModal.module.css';
import type { CodeListWithMetadata } from '../../../CodeListPage';
import { FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../../hooks/useInputCodeListNameErrorMessage';
import { StudioDialog, StudioHeading } from '@studio/components';

type CreateNewCodeListModalProps = {
  onBlurTextResource?: (textResource: TextResource) => void;
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
  codeListNames: string[];
  textResources?: TextResource[];
};

function CreateNewCodeListModal(
  {
    onBlurTextResource,
    onUpdateCodeList,
    codeListNames,
    textResources,
  }: CreateNewCodeListModalProps,
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
      className={classes.createNewCodeListModal}
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
          onBlurTextResource={onBlurTextResource}
          onUpdateCodeList={onUpdateCodeList}
          onCloseModal={handleCloseDialog}
          textResources={textResources}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
}

const ForwardedCreateNewCodeListModal = forwardRef(CreateNewCodeListModal);

export { ForwardedCreateNewCodeListModal as CreateNewCodeListModal };

type CreateNewCodeListProps = {
  codeList: CodeList;
  codeListNames: string[];
  onBlurTextResource?: (textResource: TextResource) => void;
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
  onCloseModal: () => void;
  textResources?: TextResource[];
};

function CreateNewCodeList({
  codeList,
  codeListNames,
  onBlurTextResource,
  onUpdateCodeList,
  onCloseModal,
  textResources,
}: CreateNewCodeListProps) {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
  const [isCodeListValid, setIsCodeListValid] = useState<boolean>(true);
  const [codeListTitleError, setCodeListTitleError] = useState<string>('');
  const [currentCodeListWithMetadata, setCurrentCodeListWithMetadata] =
    useState<CodeListWithMetadata>({
      title: '',
      codeList,
    });

  const handleSaveCodeList = () => {
    onUpdateCodeList(currentCodeListWithMetadata);
    onCloseModal();
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

  const handleCodeListChange = (updatedCodeList: CodeList) => {
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

  const shouldSaveButtonBeDisabled =
    !isCodeListValid || !currentCodeListWithMetadata.title || codeListTitleError;

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
          onBlurTextResource={onBlurTextResource}
          onChange={handleCodeListChange}
          onInvalid={handleInvalidCodeList}
          texts={editorTexts}
          textResources={textResources}
        />
      </div>
      <StudioButton
        color='success'
        title={t('app_content_library.code_lists.save_new_code_list')}
        icon={<CheckmarkIcon />}
        onClick={handleSaveCodeList}
        variant='secondary'
        disabled={shouldSaveButtonBeDisabled}
      >
        {t('app_content_library.code_lists.save_new_code_list')}
      </StudioButton>
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
