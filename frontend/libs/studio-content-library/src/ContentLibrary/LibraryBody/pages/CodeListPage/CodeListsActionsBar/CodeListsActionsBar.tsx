import React, { useEffect, useState } from 'react';
import { StudioFileUploader, StudioSearch, usePrevious } from '@studio/components';
import type { ChangeEvent } from 'react';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeListPage';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';

export type CodeListsActionsBarProps = {
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  onHandleSearchCodeLists: (codeListPatternMatch: string) => void;
};

export function CodeListsActionsBar({
  onUploadCodeList,
  onUpdateCodeList,
  codeListNames,
  onHandleSearchCodeLists,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
  const [codeListSearchPattern, setCodeListSearchPattern] = useState<string>('.*');
  const previousSearchPattern = usePrevious<string>(codeListSearchPattern);

  useEffect(() => {
    if (previousSearchPattern !== codeListSearchPattern) {
      onHandleSearchCodeLists(codeListSearchPattern);
    }
  }, [codeListNames, onHandleSearchCodeLists, previousSearchPattern, codeListSearchPattern]);

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
        className={classes.searchField}
        label={t('app_content_library.code_lists.search_label')}
        size='sm'
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setCodeListSearchPattern(event.target.value)
        }
        clearButtonLabel={t('app_content_library.code_lists.clear_search_button_label')}
        onClear={() => setCodeListSearchPattern('.*')}
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
