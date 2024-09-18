import React from 'react';
import { StudioButton, StudioHeading } from '@studio/components';
import classes from './ItemCategory.module.css';
import { useTranslation } from 'react-i18next';
import type { IToolbarElement } from '../../../../types/global';
import type { AddedItemProps } from '../../ComponentModal/ComponentModal';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { getComponentTitleByComponentType } from '../../../../utils/language';

export type ItemCategoryProps = {
  items: IToolbarElement[];
  category: string;
  selectedItemType: ComponentType;
  setAddedItem(addedItem: AddedItemProps): void;
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
    <div className={classes.ItemCategory}>
      <StudioHeading level={2} size='small' spacing>
        {t(`ux_editor.component_category.${category}`)}
      </StudioHeading>
      <div className={classes.componentsWrapper}>
        {items.map((item: IToolbarElement) => (
          <StudioButton
            className={classes.componentButton}
            key={item.type}
            icon={React.createElement(item.icon)}
            onClick={() =>
              setAddedItem({
                componentType: item.type,
                componentId: generateComponentId(item.type),
              })
            }
            variant={selectedItemType === item.type ? 'primary' : 'secondary'}
            size='small'
          >
            {getComponentTitleByComponentType(item.type, t) || item.label}
          </StudioButton>
        ))}
      </div>
    </div>
  );
};
