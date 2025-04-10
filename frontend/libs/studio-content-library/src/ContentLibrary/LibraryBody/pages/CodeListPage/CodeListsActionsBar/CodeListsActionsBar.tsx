import React from 'react';
import type { TextResource } from '@studio/components-legacy';
import { StudioFileUploader, StudioSearch } from '@studio/components-legacy';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';

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

  return (
    <div className={classes.actionsBar}>
      <StudioSearch
        label={t('app_content_library.code_lists.search_label')}
        onChange={handleChangeSearch}
        clearButtonLabel={t('app_content_library.code_lists.clear_search_button_label')}
        onClear={handleClearSearch}
      />
      <CreateNewCodeListModal
        codeListNames={codeListNames}
        onBlurTextResource={onBlurTextResource}
        onUpdateCodeList={onUpdateCodeList}
        textResources={textResources}
      />
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
