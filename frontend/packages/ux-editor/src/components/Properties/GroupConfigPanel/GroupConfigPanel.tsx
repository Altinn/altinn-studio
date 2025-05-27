import React from 'react';
import { StudioAlert } from '@studio/components';
import classes from './GroupConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components-legacy';
import { FileIcon } from '@studio/icons';
import { useAppContext } from '../../../hooks';

export const GroupConfigPanel = () => {
  const { t } = useTranslation();
  const { selectedItem } = useAppContext();

  return (
    <>
      <StudioSectionHeader
        data-testid='groupConfigPanel'
        icon={<FileIcon />}
        heading={{
          text: selectedItem?.id,
          level: 2,
        }}
      />
      <StudioAlert data-color='info' className={classes.configPanel}>
        {t('right_menu.content_group_message')}
      </StudioAlert>
    </>
  );
};
