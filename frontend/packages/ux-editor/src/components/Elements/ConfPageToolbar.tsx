import React from 'react';
import classes from './ConfPageToolbar.module.css';
import type { IToolbarElement } from '../../types/global';
import { ToolbarItem } from './ToolbarItem';
import {
  confOnScreenComponents,
  paymentLayoutComponents,
  subformLayoutComponents,
} from '../../data/formItemConfig';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import type { ConfPageType } from './types/ConfigPageType';
import { useComponentTitle } from '@altinn/ux-editor/hooks';

const getAvailableComponentList = (confPageType: ConfPageType) => {
  switch (confPageType) {
    case 'receipt':
      return confOnScreenComponents;
    case 'payment':
      return paymentLayoutComponents;
    case 'subform':
      return subformLayoutComponents;
    default:
      return [];
  }
};

export type ConfPageToolbarProps = {
  confPageType: ConfPageType;
};

export const ConfPageToolbar = ({ confPageType }: ConfPageToolbarProps) => {
  const getComponentTitle = useComponentTitle();

  const componentList: IToolbarElement[] = getAvailableComponentList(confPageType).map(
    mapComponentToToolbarElement,
  );

  return (
    <div className={classes.customComponentList}>
      {componentList.map((component: IToolbarElement) => (
        <ToolbarItem
          componentTitle={getComponentTitle(component)}
          icon={component.icon}
          componentType={component.type}
          key={component.type}
        />
      ))}
    </div>
  );
};
