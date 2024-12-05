import React from 'react';
import { Search } from '@digdir/designsystemet-react';
import { StudioFileUploader } from '@studio/components';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeList';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';

type CodeListsActionsBarProps = {
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
};

export function CodeListsActionsBar({
  onUploadCodeList,
  onUpdateCodeList,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.actionsBar}>
      <Search
        className={classes.searchField}
        size='sm'
        placeholder={t('app_content_library.code_lists.search_placeholder')}
      />
      <CreateNewCodeListModal onUpdateCodeList={onUpdateCodeList} />
      <StudioFileUploader
        accept='.json'
        size='small'
        variant='tertiary'
        uploaderButtonText={t('app_content_library.code_lists.upload_code_list')}
        onSubmit={onUploadCodeList}
      />
    </div>
  );
}
