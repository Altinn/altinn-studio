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

type CreateNewCodeListModalProps = {
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
};

export function CreateNewCodeListModal({ onUpdateCodeList }: CreateNewCodeListModalProps) {
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
          onUpdateCodeList={onUpdateCodeList}
          onCloseModal={handleCloseModal}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}

type CreateNewCodeListProps = {
  codeList: CodeList;
  onUpdateCodeList: (codeListWithMetadata: CodeListWithMetadata) => void;
  onCloseModal: () => void;
};

function CreateNewCodeList({ codeList, onUpdateCodeList, onCloseModal }: CreateNewCodeListProps) {
  const { t } = useTranslation();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
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
    setCurrentCodeListWithMetadata({
      title: codeListTitle,
      codeList: currentCodeListWithMetadata.codeList,
    });
  };

  const handleCodeListChange = (updatedCodeList: CodeList) => {
    setCurrentCodeListWithMetadata({
      title: currentCodeListWithMetadata.title,
      codeList: updatedCodeList,
    });
  };

  const saveButtonShouldBeDisabled =
    !currentCodeListWithMetadata.title || currentCodeListWithMetadata.codeList.length == 0;

  return (
    <div className={classes.createNewCodeList}>
      <StudioTextfield
        label={t('app_content_library.code_lists.create_new_code_list_name')}
        className={classes.codeListTitle}
        size='small'
        onBlur={(event) => handleCodeListTitleChange(event.target.value)}
      />
      <div className={classes.codeListEditor}>
        <StudioCodeListEditor
          codeList={currentCodeListWithMetadata.codeList}
          onChange={handleCodeListChange}
          texts={editorTexts}
        />
      </div>
      <StudioButton
        color='success'
        title={t('app_content_library.code_lists.save_new_code_list')}
        icon={<CheckmarkIcon />}
        onClick={handleSaveCodeList}
        variant='secondary'
        disabled={saveButtonShouldBeDisabled}
      />
    </div>
  );
}
