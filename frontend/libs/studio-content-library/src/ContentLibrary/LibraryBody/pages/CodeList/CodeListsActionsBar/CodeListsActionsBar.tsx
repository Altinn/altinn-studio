import React from 'react';
import { Search } from '@digdir/designsystemet-react';
import { StudioFileUploader } from '@studio/components';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeList';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';
import { FileNameValidationResult, FileNameUtils } from '@studio/pure-functions';
import { useValidateFileName } from '../hooks/useValidateFileName';
import { toast } from 'react-toastify';

type CodeListsActionsBarProps = {
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
};

export function CodeListsActionsBar({
  onUploadCodeList,
  onUpdateCodeList,
  codeListNames,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  const { getInvalidUploadFileNameErrorMessage } = useValidateFileName();

  const onSubmit = (file: File) => {
    if (!isFileNameValid(file.name, codeListNames)) {
      const fileNameError = getFileNameError(file.name, codeListNames);
      return toast.error(getInvalidUploadFileNameErrorMessage(fileNameError));
    }
    onUploadCodeList(file);
  };

  return (
    <div className={classes.actionsBar}>
      <Search
        className={classes.searchField}
        size='sm'
        placeholder={t('app_content_library.code_lists.search_placeholder')}
      />
      <CreateNewCodeListModal onUpdateCodeList={onUpdateCodeList} codeListNames={codeListNames} />
      <StudioFileUploader
        accept='.json'
        size='small'
        variant='tertiary'
        uploaderButtonText={t('app_content_library.code_lists.upload_code_list')}
        onSubmit={onSubmit}
      />
    </div>
  );
}

const getFileNameError = (fileName: string, invalidFileNames: string[]) => {
  return FileNameUtils.validateFileName(FileNameUtils.removeExtension(fileName), invalidFileNames);
};

const isFileNameValid = (fileName: string, invalidFileNames: string[]) => {
  const fileNameError = getFileNameError(fileName, invalidFileNames);
  return fileNameError === FileNameValidationResult.Valid;
};
