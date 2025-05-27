import React from 'react';
import classes from './Properties.module.css';
import { PageConfigPanel } from './PageConfigPanel';
import { useAppContext } from '../../hooks';
import { GroupConfigPanel } from './GroupConfigPanel/GroupConfigPanel';
import { ComponentConfigPanel } from './ComponentConfigPanel/ComponentConfigPanel';
import { StudioSectionHeader } from '@studio/components-legacy';
import { FileIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ItemType } from './ItemType';

export const Properties = () => {
  return (
    <div className={classes.root} data-testid='properties-root'>
      <PropertiesSelectedConfig />
    </div>
  );
};

const PropertiesSelectedConfig = () => {
  const { selectedItem } = useAppContext();
  const { t } = useTranslation();
  switch (selectedItem?.type) {
    case ItemType.Component:
      return <ComponentConfigPanel />;
    case ItemType.Page:
      return <PageConfigPanel />;
    case ItemType.Group:
      return <GroupConfigPanel />;
    default:
      return (
        <StudioSectionHeader
          icon={<FileIcon />}
          heading={{
            text: t('right_menu.content_empty'),
            level: 2,
          }}
        />
      );
  }
};
