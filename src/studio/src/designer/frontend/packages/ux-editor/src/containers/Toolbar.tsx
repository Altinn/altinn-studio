import React, { useState } from 'react';
import { List } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { mapComponentToToolbarElement, mapWidgetToToolbarElement } from '../utils/formLayout';
import { advancedComponents, ComponentTypes, schemaComponents, textComponents } from '../components';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { ToolbarGroup } from './ToolbarGroup';
import type { IAppState, IWidget } from '../types/global';

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
  const [componentInformationPanelOpen, setComponentInformationPanelOpen] = useState<boolean>(false);
  const [componentSelectedForInformationPanel, setComponentSelectedForInformationPanel] =
    useState<ComponentTypes>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [componentListsState, setComponentListsState] = useState<any>({
    [CollapsableMenus.Components]: { expanded: true, animationDone: false },
    [CollapsableMenus.Texts]: { expanded: false, animationDone: false },
    [CollapsableMenus.AdvancedComponents]: { expanded: false, animationDone: false },
    [CollapsableMenus.Widgets]: { expanded: false, animationDone: false },
  });

  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language: any = useSelector((state: IAppState) => state.appData.languageState.language);
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const order: any[] = useSelector((state: IAppState) => GetLayoutOrderSelector(state));
  const widgetsList: IWidget[] = useSelector((state: IAppState) => state.widgets.widgets);

  const componentList: IToolbarElement[] = schemaComponents.map((component) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const textComponentList: IToolbarElement[] = textComponents.map((component: any) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const advancedComponentsList: IToolbarElement[] = advancedComponents.map((component: any) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const widgetComponentsList: IToolbarElement[] = widgetsList.map((widget: any) => {
    return mapWidgetToToolbarElement(widget, activeList, order, language, dispatch);
  });

  const allComponentLists: any = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
    [CollapsableMenus.Widgets]: widgetComponentsList,
    // [CollapsableMenus.ThirdParty]: thirdPartyComponentList,
  };

  const handleComponentInformationOpen = (component: ComponentTypes, event: any) => {
    setComponentInformationPanelOpen(true);
    setComponentSelectedForInformationPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setComponentInformationPanelOpen(false);
    setComponentSelectedForInformationPanel(null);
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
      <List
        id='collapsable-items'
        tabIndex={-1}
        component='div'
      >
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
        informationPanelOpen={componentInformationPanelOpen}
        onClose={handleComponentInformationClose}
        selectedComponent={componentSelectedForInformationPanel}
      />
    </div>
  );
}
