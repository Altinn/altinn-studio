import React from 'react';
import type { IToolbarElement } from '../../types/global';
import { ToolbarItem } from './ToolbarItem';
import { confOnScreenComponents } from '../../data/formItemConfig';
import { getComponentTitleByComponentType } from '../../utils/language';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

export const ConfPageToolbar = () => {
  const { t } = useTranslation();

  const componentList: IToolbarElement[] = confOnScreenComponents.map(mapComponentToToolbarElement);

  return componentList.map((component: IToolbarElement) => (
    <ToolbarItem
      text={getComponentTitleByComponentType(component.type, t) || component.label}
      icon={component.icon}
      componentType={component.type}
      key={component.type}
    />
  ));
};
