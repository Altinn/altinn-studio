import React from 'react';
import type { CollapsableMenus, IToolbarElement } from '../../types/global';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { ToolbarItem } from './ToolbarItem';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';

export interface IToolbarGroupProps {
  list: string;
  components: IToolbarElement[];
  componentListOpen: boolean;
  menuType: CollapsableMenus;
  componentListCloseAnimationDone: boolean;
  setCollapsableListAnimationState: (list: string, done: boolean) => void;
  handleCollapsableListClicked: (menu: CollapsableMenus) => void;
  handleComponentInformationOpen: (component: ComponentType, event: any) => void;
}

export function ToolbarGroup(props: IToolbarGroupProps) {
  const { t } = useTranslation();

  return (
    <>
      {props.components.map((component: IToolbarElement) => (
        <ToolbarItem
          text={getComponentTitleByComponentType(component.type, t) || component.label}
          icon={component.icon}
          componentType={component.type}
          onClick={props.handleComponentInformationOpen}
          key={component.type}
        />
      ))}
    </>
  );
}
