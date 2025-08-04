import React from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../types/global';
import classes from './AddItemContent.module.css';
import { ItemCategory } from './ItemCategory';
import type { AddedItem } from './types';
import { ItemInfo } from './ItemInfo';
import { useFormLayouts } from '../../../hooks';
import { generateComponentId } from '../../../utils/generateId';
import { StudioParagraph, StudioSearch } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useSearchComponent } from './useSearchComponent';

export type AddItemContentProps = {
  item: AddedItem | null;
  setItem: (item: AddedItem | null) => void;
  onAddItem: (addedItem: AddedItem) => void;
  onCancel: () => void;
  availableComponents: KeyValuePairs<IToolbarElement[]>;
};

export const AddItemContent = ({
  item,
  setItem,
  onAddItem,
  onCancel,
  availableComponents,
}: AddItemContentProps) => {
  const layouts = useFormLayouts();
  const { t } = useTranslation(['translation', 'addComponentModal']);
  const { searchText, handleSearchChange, filteredComponents } = useSearchComponent({
    availableComponents,
    t,
  });

  return (
    <div className={classes.root}>
      <div className={classes.allComponentsWrapper}>
        <div className={classes.container}>
          <StudioSearch
            label={t('ux_editor.add_item.component_search_label')}
            value={searchText}
            onChange={handleSearchChange}
            clearButtonLabel={t('general.search_clear_button_title')}
          />
          <StudioParagraph>
            {t('ux_editor.add_item.component_more_info_description')}
          </StudioParagraph>
        </div>
        <div className={classes.componentsGrid}>
          {Object.keys(filteredComponents).map((key) => {
            return (
              <ItemCategory
                key={key}
                category={key}
                items={filteredComponents[key]}
                selectedItemType={item?.componentType}
                setAddedItem={setItem}
                generateComponentId={(type: ComponentType) => generateComponentId(type, layouts)}
              />
            );
          })}
        </div>
      </div>
      <div className={classes.componentsInfoWrapper}>
        <ItemInfo onAddItem={onAddItem} onCancel={onCancel} item={item} setItem={setItem} />
      </div>
    </div>
  );
};
