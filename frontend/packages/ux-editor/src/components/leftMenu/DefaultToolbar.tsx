import React, { useState } from 'react';
import type { ComponentType } from '..';
import type { IToolbarElement } from '../../types/global';
import { CollapsableMenus } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { ToolbarGroup } from './ToolbarGroup';
import { advancedComponents, schemaComponents, textComponents } from '..';
import { mapComponentToToolbarElement, mapWidgetToToolbarElement } from '../../utils/formLayoutUtils';
import { useDispatch } from 'react-redux';

import './DefaultToolbar.css';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../../selectors/formLayoutSelectors';
import { useAddFormComponentMutation } from '../../hooks/mutations/useAddFormComponentMutation';
import { useAddFormContainerMutation } from '../../hooks/mutations/useAddFormContainerMutation';
import { useWidgetsQuery } from '../../hooks/queries/useWidgetsQuery';

export function DefaultToolbar() {
  const dispatch = useDispatch();
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [componentListsState, setComponentListsState] = useState<any>({
    [CollapsableMenus.Components]: { expanded: true, animationDone: false },
    [CollapsableMenus.Texts]: { expanded: false, animationDone: false },
    [CollapsableMenus.AdvancedComponents]: { expanded: false, animationDone: false },
    [CollapsableMenus.Widgets]: { expanded: false, animationDone: false },
  });

  const { t } = useTranslation();
  const { order } = useFormLayoutsSelector(selectedLayoutSelector);
  const { org, app } = useParams();
  const { data: widgetsList } = useWidgetsQuery(org, app);
  const addFormComponentMutation = useAddFormComponentMutation(org, app);
  const addFormContainerMutation = useAddFormContainerMutation(org, app);
  const componentList: IToolbarElement[] = schemaComponents.map(
    (component) => mapComponentToToolbarElement(
      component,
      t,
      order,
      dispatch,
      addFormComponentMutation,
      addFormContainerMutation,
    )
  );

  const textComponentList: IToolbarElement[] = textComponents.map(
    (component) => mapComponentToToolbarElement(
      component,
      t,
      order,
      dispatch,
      addFormComponentMutation,
      addFormContainerMutation,
    )
  );

  const advancedComponentsList: IToolbarElement[] = advancedComponents.map(
    (component) => mapComponentToToolbarElement(
      component,
      t,
      order,
      dispatch,
      addFormComponentMutation,
      addFormContainerMutation,
    )
  );

  const widgetComponentsList: IToolbarElement[] = widgetsList.map(
    (widget) => mapWidgetToToolbarElement(widget, order, t, dispatch)
  );

  const allComponentLists: any = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
    [CollapsableMenus.Widgets]: widgetComponentsList,
    // [CollapsableMenus.ThirdParty]: thirdPartyComponentList,
  };

  const handleComponentInformationOpen = (component: ComponentType, event: any) => {
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
    <>
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
            setCollapsableListAnimationState={setCollapsableListAnimationState}
          />
        );
      })}
      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={compInfoPanelOpen}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </>
  );
}
