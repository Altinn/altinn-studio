import React from 'react';
import classes from './Properties.module.css';
import { PageConfigPanel } from './PageConfigPanel';
import { useAppContext } from '../../hooks';
import { GroupConfigPanel } from './GroupConfigPanel/GroupConfigPanel';
import { ComponentConfigPanel } from './ComponentConfigPanel/ComponentConfigPanel';
import { FileIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ItemType } from './ItemType';
import { ConfigPanelHeader } from './CommonElements/ConfigPanelHeader/ConfigPanelHeader';
import type { SelectedItem } from '../../AppContext';

export const Properties = () => {
  return (
    <div className={classes.root} data-testid='properties-root'>
      <PropertiesSelectedConfig />
    </div>
  );
};

const PropertiesSelectedConfig = () => {
  const { selectedItem, selectedFormLayoutName } = useAppContext();
  const { t } = useTranslation();

  const currentSelectedItem: SelectedItem | null =
    selectedItem?.type === ItemType.Component || selectedItem?.type === ItemType.Group
      ? selectedItem
      : selectedFormLayoutName
        ? { type: ItemType.Page, id: selectedFormLayoutName }
        : selectedItem;

  switch (currentSelectedItem?.type) {
    case ItemType.Component:
      return (
        <ComponentConfigPanel selectedItem={currentSelectedItem} key={currentSelectedItem.id} />
      );
    case ItemType.Page:
      return <PageConfigPanel selectedItem={currentSelectedItem} key={currentSelectedItem.id} />;
    case ItemType.Group:
      return <GroupConfigPanel selectedItem={currentSelectedItem} key={currentSelectedItem.id} />;
    default:
      return <ConfigPanelHeader icon={<FileIcon />} title={t('right_menu.content_empty')} />;
  }
};
