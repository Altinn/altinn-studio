import React from 'react';
import classes from './ConfPageToolbar.module.css';
import type { IToolbarElement } from '../../types/global';
import { ToolbarItem } from './ToolbarItem';
import { confOnScreenComponents, paymentLayoutComponents } from '../../data/formItemConfig';
import { getComponentTitleByComponentType } from '../../utils/language';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

const getAvailableComponentList = (confPageType: ConfPageType) => {
  switch (confPageType) {
    case 'receipt':
      return confOnScreenComponents;
    case 'payment':
      return paymentLayoutComponents;
    default:
      return [];
  }
};

export type ConfPageType = 'receipt' | 'payment';

export type ConfPageToolbarProps = {
  confPageType: ConfPageType;
};

export const ConfPageToolbar = ({ confPageType }: ConfPageToolbarProps) => {
  const { t } = useTranslation();

  const componentList: IToolbarElement[] = getAvailableComponentList(confPageType).map(
    mapComponentToToolbarElement,
  );

  return (
    <div className={classes.customComponentList}>
      {componentList.map((component: IToolbarElement) => (
        <ToolbarItem
          text={getComponentTitleByComponentType(component.type, t) || component.label}
          icon={component.icon}
          componentType={component.type}
          key={component.type}
        />
      ))}
    </div>
  );
};
