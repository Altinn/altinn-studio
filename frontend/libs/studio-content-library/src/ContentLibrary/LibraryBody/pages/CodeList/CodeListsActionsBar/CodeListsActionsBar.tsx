import React from 'react';
import { Search } from '@digdir/designsystemet-react';
import { StudioButton, StudioFileUploader } from '@studio/components';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';

type CodeListsActionsBarProps = {
  onUploadCodeList: (updatedCodeList: File) => void;
};

export function CodeListsActionsBar({ onUploadCodeList }: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.actionsBar}>
      <Search
        className={classes.searchField}
        size='sm'
        placeholder={t('app_content_library.code_lists.search_placeholder')}
      />
      <StudioButton size='small' variant='secondary'>
        {t('app_content_library.code_lists.create_new_code_list')}
      </StudioButton>
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
