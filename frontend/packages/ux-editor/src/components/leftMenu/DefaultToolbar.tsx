import React, { useState } from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { IToolbarElement } from '../../types/global';
import { CollapsableMenus } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { ToolbarGroup } from './ToolbarGroup';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import './DefaultToolbar.css';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Accordion } from 'app-shared/components/Accordion';
import { getCollapsableMenuTitleByType } from '../../utils/language';

export function DefaultToolbar() {
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [componentListsState, setComponentListsState] = useState<any>({
    [CollapsableMenus.Components]: { expanded: true, animationDone: false },
    [CollapsableMenus.Texts]: { expanded: false, animationDone: false },
    [CollapsableMenus.AdvancedComponents]: { expanded: false, animationDone: false },
    // TODO: Uncomment when widgets are implemented
    // [CollapsableMenus.Widgets]: { expanded: false, animationDone: false },
  });

  const { t } = useTranslation();
  // TODO: Uncomment when widgets are implemented
  // const { org, app } = useParams();
  // const { data: widgetsList } = useWidgetsQuery(org, app);

  const componentList: IToolbarElement[] = schemaComponents.map(mapComponentToToolbarElement);
  const textComponentList: IToolbarElement[] = textComponents.map(mapComponentToToolbarElement);
  const advancedComponentsList: IToolbarElement[] = advancedItems.map(mapComponentToToolbarElement);
  // TODO: Uncomment when widgets are implemented
  // const widgetComponentsList: IToolbarElement[] = widgetsList.map(
  //   (widget) => mapWidgetToToolbarElement(widget, t)
  // );

  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
    // TODO: Uncomment when widgets are implemented
    // [CollapsableMenus.Widgets]: widgetComponentsList,
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
      {Object.values(CollapsableMenus).map((key: CollapsableMenus) => {
        return (
          <Accordion key={key}>
            <Accordion.Item defaultOpen={key === CollapsableMenus.Components}>
              <Accordion.Header className={classes.header}>{getCollapsableMenuTitleByType(key, t)}</Accordion.Header>
              <Accordion.Content className={classes.content}>
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
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
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
