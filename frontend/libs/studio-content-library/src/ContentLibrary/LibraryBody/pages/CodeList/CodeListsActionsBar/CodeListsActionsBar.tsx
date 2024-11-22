import React from 'react';
import { Search } from '@digdir/designsystemet-react';
import { StudioFileUploader } from '@studio/components';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeList';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';
import { FileNameValidationResult, FileNameUtils } from '@studio/pure-functions';
import { useValidateFileName } from '../hooks/useValidateFileName';

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
  const { handleInvalidUploadedFileName } = useValidateFileName();

  const onSubmit = (file: File) => {
    const fileNameError = FileNameUtils.validateFileName(
      FileNameUtils.removeExtension(file.name),
      codeListNames,
    );
    if (fileNameError !== FileNameValidationResult.Valid)
      handleInvalidUploadedFileName(fileNameError);
    else onUploadCodeList(file);
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
