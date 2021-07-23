/* eslint-disable import/no-cycle */
import * as React from 'react';
import { Collapse, makeStyles } from '@material-ui/core';
import List from '@material-ui/core/List';
import { getComponentTitleByComponentType } from '../utils/language';
import { ComponentTypes } from '../components';
import { CollapsableMenuComponent } from '../components/toolbar/CollapsableMenuComponent';
import { ToolbarItem } from './ToolbarItem';
import { IToolbarElement, CollapsableMenus } from './Toolbar';

export interface IToolbarGroupProps {
  list: string;
  components: IToolbarElement[];
  componentListOpen: boolean;
  menuType: CollapsableMenus;
  componentListCloseAnimationDone: boolean;
  language: any;
  setCollapsableListAnimationState: (list: string, done: boolean) => void;
  handleCollapsableListClicked: (menu: CollapsableMenus) => void;
  handleComponentInformationOpen: (component: ComponentTypes, event: any) => void;
}

const useStyles = makeStyles({
  collapsableContainer: {
    paddingRight: '2px',
    paddingLeft: '2px',
  },
});

export function ToolbarGroup(props: IToolbarGroupProps) {
  const classes = useStyles();
  const handleExitCollapse = () => {
    props.setCollapsableListAnimationState(props.list, true);
  };

  const handleEnterCollapse = () => {
    props.setCollapsableListAnimationState(props.list, false);
  };

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
        classes={{
          root: classes.collapsableContainer,
        }}
      >
        <List
          dense={false}
          id={`${props.list}-components`}
          component='div'
        >
          {props.components.map((component: IToolbarElement) => (
            <ToolbarItem
              text={getComponentTitleByComponentType(component.type, props.language)
                || component.label}
              icon={component.icon}
              componentType={component.type}
              onDropAction={component.actionMethod}
              onClick={props.handleComponentInformationOpen}
              key={component.type}
            />
          ))
          }
        </List>
      </Collapse>
    </>
  );
}
