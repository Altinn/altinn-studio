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
import type { CodeListWithMetadata } from '../../CodeListPage';
import { FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import { FILE_NAME_REGEX } from '../../../../../../constants';

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
    const fileNameError = FileNameUtils.findFileNameError(
      updatedTitle,
      codeListNames,
      FILE_NAME_REGEX,
    );
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
