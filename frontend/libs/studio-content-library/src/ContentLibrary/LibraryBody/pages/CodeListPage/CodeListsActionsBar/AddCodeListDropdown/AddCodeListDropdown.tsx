import React, { useRef } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateNewCodeListDialog } from './CreateNewCodeListDialog';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';
import { StudioDropdown } from '@studio/components';
import { PlusCircleIcon, PlusIcon, UploadIcon } from '@studio/icons';
import type { CodeListWithMetadata } from '../../types/CodeListWithMetadata';
import type { TextResource } from '@studio/components-legacy';

export type AddCodeListDropdownProps = {
  onBlurTextResource?: (textResource: TextResource) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  textResources?: TextResource[];
};

export function AddCodeListDropdown({
  codeListNames,
  onBlurTextResource,
  onUploadCodeList,
  onUpdateCodeList,
  textResources,
}: AddCodeListDropdownProps): ReactElement {
  const { t } = useTranslation();
  const addCodeListRef = useRef<HTMLDialogElement>(null);

  const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();

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
    <>
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
      <CreateNewCodeListDialog
        codeListNames={codeListNames}
        onBlurTextResource={onBlurTextResource}
        onUpdateCodeList={onUpdateCodeList}
        textResources={textResources}
        ref={addCodeListRef}
      />
    </>
  );
}
