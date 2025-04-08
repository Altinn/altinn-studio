import React, { useRef } from 'react';
import type { TextResource } from '@studio/components-legacy';
import { StudioSearch } from '@studio/components-legacy';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeListPage';
import { CreateNewCodeListModal } from './CreateNewCodeListModal';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';
import { StudioDropdown } from '@studio/components';
import { PlusCircleIcon, PlusIcon, UploadIcon } from '@studio/icons';

export type CodeListsActionsBarProps = {
  onBlurTextResource?: (textResource: TextResource) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  onSetSearchString: (searchString: string) => void;
  textResources?: TextResource[];
};

export function CodeListsActionsBar({
  onBlurTextResource,
  onUploadCodeList,
  onUpdateCodeList,
  codeListNames,
  onSetSearchString,
  textResources,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  const addCodeListRef = useRef<HTMLDialogElement>(null);

  const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    onSetSearchString(event.target.value);

  const handleClearSearch = () => onSetSearchString('');

  const onSubmit = (file: File) => {
    const fileNameError = FileNameUtils.findFileNameError(
      FileNameUtils.removeExtension(file.name),
      codeListNames,
    );
    if (fileNameError) {
      return toast.error(getInvalidUploadFileNameErrorMessage(fileNameError));
    }
    onUploadCodeList(file);
  };

  const handleOpenAddCodeListDialog = () => {
    addCodeListRef.current?.showModal();
  };

  return (
    <div className={classes.actionsBar}>
      <StudioSearch
        label={t('app_content_library.code_lists.search_label')}
        onChange={handleChangeSearch}
        clearButtonLabel={t('app_content_library.code_lists.clear_search_button_label')}
        onClear={handleClearSearch}
      />
      <StudioDropdown
        triggerButtonVariant='secondary'
        triggerButtonText={t('app_content_library.code_lists.add_new_code_list')}
        icon={<PlusIcon />}
      >
        <StudioDropdown.Item>
          <StudioDropdown.Button onClick={handleOpenAddCodeListDialog} icon={<PlusCircleIcon />}>
            {t('app_content_library.code_lists.create_new_code_list')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.FileUploaderButton
            icon={<UploadIcon />}
            onFileUpload={onSubmit}
            fileInputProps={{ accept: '.json' }}
          >
            {t('app_content_library.code_lists.upload_code_list')}
          </StudioDropdown.FileUploaderButton>
        </StudioDropdown.Item>
      </StudioDropdown>
      <CreateNewCodeListModal
        codeListNames={codeListNames}
        onBlurTextResource={onBlurTextResource}
        onUpdateCodeList={onUpdateCodeList}
        textResources={textResources}
        ref={addCodeListRef}
      />
    </div>
  );
}
