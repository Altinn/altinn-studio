import React from 'react';
import { StudioAlert } from '@studio/components';
import classes from './GroupConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components-legacy';
import { FileIcon } from '@studio/icons';
import type { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';

type GroupConfigPanelProps = {
  selectedItem: Extract<SelectedItem, { type: ItemType.Group }>;
};

export const GroupConfigPanel = ({ selectedItem }: GroupConfigPanelProps) => {
  const { t } = useTranslation();

  return (
    <>
      <StudioSectionHeader
        data-testid='groupConfigPanel'
        icon={<FileIcon />}
        heading={{
          text: selectedItem.id.toString(),
          level: 2,
        }}
      />
      <StudioAlert data-color='info' className={classes.configPanel}>
        {t('right_menu.content_group_message')}
      </StudioAlert>
    </>
  );
};
