import React from 'react';
import { StudioCard } from '@studio/components-legacy';
import { StudioHeading } from '@studio/components';
import classes from './ItemCategory.module.css';
import { useTranslation } from 'react-i18next';
import type { IToolbarElement } from '../../../../types/global';
import type { AddedItem } from '../types';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { getTitleByComponentType } from '../../../../utils/language';
import { ComponentButton } from '../ComponentButton';

export type ItemCategoryProps = {
  items: IToolbarElement[];
  category: string;
  selectedItemType: ComponentType | CustomComponentType;
  setAddedItem(addedItem: AddedItem): void;
  generateComponentId: (type: string) => string;
};

export const ItemCategory = ({
  items,
  category,
  selectedItemType,
  setAddedItem,
  generateComponentId,
}: ItemCategoryProps) => {
  const { t } = useTranslation();

  return (
    <StudioCard color='subtle' className={classes.itemCategory}>
      <StudioHeading className={classes.categoryHeading} level={2}>
        {t(`ux_editor.component_category.${category}`)}
      </StudioHeading>
      <div className={classes.componentsWrapper}>
        {items.map((item: IToolbarElement) => (
          <ComponentButton
            tooltipContent={getTitleByComponentType(item.type, t) || item.label}
            selected={selectedItemType === item.type}
            key={item.type}
            icon={item.icon}
            onClick={() => {
              setAddedItem({
                componentType: item.type,
                componentId: generateComponentId(item.type),
              });
            }}
          />
        ))}
      </div>
    </StudioCard>
  );
};
