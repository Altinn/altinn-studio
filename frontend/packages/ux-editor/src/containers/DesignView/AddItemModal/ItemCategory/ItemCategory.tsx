import React from 'react';
import { StudioButton, StudioCard, StudioHeading } from '@studio/components';
import classes from './ItemCategory.module.css';
import { useTranslation } from 'react-i18next';
import type { IToolbarElement } from '../../../../types/global';
import type { AddedItem } from '../types';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { getComponentTitleByComponentType } from '../../../../utils/language';

export type ItemCategoryProps = {
  items: IToolbarElement[];
  category: string;
  selectedItemType: ComponentType;
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
      <StudioHeading level={2} size='small'>
        {t(`ux_editor.component_category.${category}`)}
      </StudioHeading>
      <div className={classes.componentsWrapper}>
        {items.map((item: IToolbarElement) => (
          <ComponentButton
            tooltipContent={getComponentTitleByComponentType(item.type, t) || item.label}
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

type ComponentButtonProps = {
  tooltipContent: string;
  selected: boolean;
  icon: React.ComponentType;
  onClick: () => void;
};
function ComponentButton({ tooltipContent, selected, icon, onClick }: ComponentButtonProps) {
  return (
    <StudioButton
      variant={selected ? 'primary' : 'tertiary'}
      onClick={onClick}
      size='sm'
      aria-label={tooltipContent}
      className={classes.componentButton}
      title={tooltipContent}
      icon={React.createElement(icon, { fontSize: '1.5rem' } as any)}
    >
      {tooltipContent}
    </StudioButton>
  );
}
