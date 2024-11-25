import React, { createRef, useState } from 'react';
import {
  StudioButton,
  StudioCodeListEditor,
  StudioModal,
  StudioTextfield,
} from '@studio/components';
import type { CodeList, CodeListEditorTexts } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useOptionListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { CheckmarkIcon } from '@studio/icons';
import classes from './CreateNewCodeListModal.module.css';
import type { CodeListWithMetadata } from '../../CodeList';
import { FileNameUtils, FileNameValidationResult } from '@studio/pure-functions';
import { useValidateFileName } from '../../hooks/useValidateFileName';

type CreateNewCodeListModalProps = {
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
  codeListNames: string[];
};

export function CreateNewCodeListModal({
  onUpdateCodeList,
  codeListNames,
}: CreateNewCodeListModalProps) {
  const { t } = useTranslation();
  const modalRef = createRef<HTMLDialogElement>();

  const newCodeList: CodeList = [];

  const handleCloseModal = () => {
    modalRef.current?.close();
  };

  return (
    <StudioModal.Root>
      <StudioModal.Trigger variant='secondary'>
        {t('app_content_library.code_lists.create_new_code_list')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.createNewCodeListModal}
        closeButtonTitle={t('general.close')}
        heading={t('app_content_library.code_lists.create_new_code_list_modal_title')}
      >
        <CreateNewCodeList
          codeList={newCodeList}
          codeListNames={codeListNames}
          onUpdateCodeList={onUpdateCodeList}
          onCloseModal={handleCloseModal}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}

type CreateNewCodeListProps = {
  codeList: CodeList;
  codeListNames: string[];
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
  onCloseModal: () => void;
};

function CreateNewCodeList({
  codeList,
  codeListNames,
  onUpdateCodeList,
  onCloseModal,
}: CreateNewCodeListProps) {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const { getInvalidInputFileNameErrorMessage } = useValidateFileName();
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

  const handleCodeListTitleChange = (codeListTitle: string) => {
    const fileNameError = FileNameUtils.validateFileName(codeListTitle, codeListNames);
    const errorMessage = getInvalidInputFileNameErrorMessage(fileNameError);
    setCodeListTitleError(errorMessage ?? '');
    if (fileNameError === FileNameValidationResult.Valid)
      setCurrentCodeListWithMetadata({
        title: codeListTitle,
        codeList: currentCodeListWithMetadata.codeList,
      });
  };

  const handleCodeListChange = (updatedCodeList: CodeList) => {
    setIsCodeListValid(true);
    setCurrentCodeListWithMetadata({
      title: currentCodeListWithMetadata.title,
      codeList: updatedCodeList,
    });
  };

  const handleInvalidCodeList = () => {
    setIsCodeListValid(false);
  };

  const isSaveButtonDisabled =
    !isCodeListValid || !currentCodeListWithMetadata.title || codeListTitleError;

  return (
    <div className={classes.createNewCodeList}>
      <StudioTextfield
        label={t('app_content_library.code_lists.create_new_code_list_name')}
        className={classes.codeListTitle}
        size='small'
        onChange={(event) => handleCodeListTitleChange(event.target.value)}
        error={codeListTitleError}
      />
      <div className={classes.codeListEditor}>
        <StudioCodeListEditor
          codeList={currentCodeListWithMetadata.codeList}
          onChange={handleCodeListChange}
          onInvalid={handleInvalidCodeList}
          texts={editorTexts}
        />
      </div>
      <StudioButton
        color='success'
        title={t('app_content_library.code_lists.save_new_code_list')}
        icon={<CheckmarkIcon />}
        onClick={handleSaveCodeList}
        variant='secondary'
        disabled={isSaveButtonDisabled}
      >
        {t('app_content_library.code_lists.save_new_code_list')}
      </StudioButton>
    </div>
  );
}
