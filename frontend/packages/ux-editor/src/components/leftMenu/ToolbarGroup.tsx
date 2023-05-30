import React from 'react';
import classes from './ToolbarGroup.module.css';
import type { CollapsableMenus, IToolbarElement } from '../../types/global';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { CollapsableMenuComponent } from '../toolbar/CollapsableMenuComponent';
import { Collapse } from '@mui/material';
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
  const handleExitCollapse = () => props.setCollapsableListAnimationState(props.list, true);
  const handleEnterCollapse = () => props.setCollapsableListAnimationState(props.list, false);
  return (
    <>
      <CollapsableMenuComponent
        menuIsOpen={props.componentListOpen}
        onClick={props.handleCollapsableListClicked}
        menuType={props.menuType}
      />

      <Collapse
        in={props.componentListOpen}
        onExited={handleExitCollapse}
        onEnter={handleEnterCollapse}
        style={props.componentListCloseAnimationDone ? { display: 'none' } : {}}
        className={classes.collapsableContainer}
      >
        {props.components.map((component: IToolbarElement) => (
          <ToolbarItem
            text={getComponentTitleByComponentType(component.type, t) || component.label}
            icon={component.icon}
            componentType={component.type}
            onClick={props.handleComponentInformationOpen}
            key={component.type}
          />
        ))}
      </Collapse>
    </>
  );
}
