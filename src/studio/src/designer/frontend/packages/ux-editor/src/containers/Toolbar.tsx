import React, { useState } from 'react';
import type { ComponentTypes } from '../components';
import type { IAppState, IWidget } from '../types/global';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { List } from '@mui/material';
import { ToolbarGroup } from './ToolbarGroup';
import { advancedComponents, schemaComponents, textComponents } from '../components';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { mapComponentToToolbarElement, mapWidgetToToolbarElement } from '../utils/formLayout';
import { useDispatch, useSelector } from 'react-redux';

import './ToolBar.css';

export interface IToolbarElement {
  label: string;
  icon?: string;
  type: string;
  actionMethod: (containerId: string, position: number) => void;
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export enum CollapsableMenus {
  Components = 'schema',
  Texts = 'texts',
  AdvancedComponents = 'advanced',
  Widgets = 'widget',
}

export function Toolbar() {
  const dispatch = useDispatch();
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentTypes>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [componentListsState, setComponentListsState] = useState<any>({
    [CollapsableMenus.Components]: { expanded: true, animationDone: false },
    [CollapsableMenus.Texts]: { expanded: false, animationDone: false },
    [CollapsableMenus.AdvancedComponents]: { expanded: false, animationDone: false },
    [CollapsableMenus.Widgets]: { expanded: false, animationDone: false },
  });

  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language: any = useSelector((state: IAppState) => state.appData.languageState.language);
  const order: any[] = useSelector(makeGetLayoutOrderSelector());
  const widgetsList: IWidget[] = useSelector((state: IAppState) => state.widgets.widgets);

  const componentList: IToolbarElement[] = schemaComponents.map((component) =>
    mapComponentToToolbarElement(component, language, activeList, order, dispatch)
  );

  const textComponentList: IToolbarElement[] = textComponents.map((component) =>
    mapComponentToToolbarElement(component, language, activeList, order, dispatch)
  );

  const advancedComponentsList: IToolbarElement[] = advancedComponents.map((component) =>
    mapComponentToToolbarElement(component, language, activeList, order, dispatch)
  );

  const widgetComponentsList: IToolbarElement[] = widgetsList.map((widget) =>
    mapWidgetToToolbarElement(widget, activeList, order, language, dispatch)
  );

  const allComponentLists: any = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
    [CollapsableMenus.Widgets]: widgetComponentsList,
    // [CollapsableMenus.ThirdParty]: thirdPartyComponentList,
  };

  const handleComponentInformationOpen = (component: ComponentTypes, event: any) => {
    setCompInfoPanelOpen(true);
    setCompSelForInfoPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setCompInfoPanelOpen(false);
    setCompSelForInfoPanel(null);
    setAnchorElement(null);
  };

  const handleCollapsableListClicked = (menuItem: CollapsableMenus) => {
    setComponentListsState({
      ...componentListsState,
      [menuItem]: {
        ...componentListsState[menuItem],
        expanded: !componentListsState[menuItem].expanded,
      },
    });
  };

  const setCollapsableListAnimationState = (list: string, done: boolean) => {
    setComponentListsState({
      ...componentListsState,
      [list]: {
        ...componentListsState[list],
        animationDone: done,
      },
    });
  };

  return (
    <div className='col-sm-12'>
      <List id='collapsable-items' tabIndex={-1} component='div'>
        {Object.values(CollapsableMenus).map((key: string) => {
          return (
            <ToolbarGroup
              key={key}
              list={key}
              menuType={key as CollapsableMenus}
              components={allComponentLists[key]}
              componentListCloseAnimationDone={componentListsState[key].animationDone}
              componentListOpen={componentListsState[key].expanded}
              handleCollapsableListClicked={handleCollapsableListClicked}
              handleComponentInformationOpen={handleComponentInformationOpen}
              language={language}
              setCollapsableListAnimationState={setCollapsableListAnimationState}
            />
          );
        })}
      </List>

      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={compInfoPanelOpen}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </div>
  );
}
