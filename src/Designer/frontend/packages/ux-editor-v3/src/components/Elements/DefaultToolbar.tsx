import React from 'react';
import type { IToolbarElement } from '../../types/global';
import { CollapsableMenus } from '../../types/global';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Accordion } from '@digdir/designsystemet-react';
import {
  getCollapsableMenuTitleByType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { ToolbarItem } from './ToolbarItem';

export function DefaultToolbar() {
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

  return (
    <>
      {Object.values(CollapsableMenus).map((key: CollapsableMenus) => {
        return (
          <Accordion key={key} color='subtle'>
            <Accordion.Item
              defaultOpen={key === CollapsableMenus.Components}
              className={classes.accordionItem}
            >
              <Accordion.Header className={classes.accordionHeader}>
                {getCollapsableMenuTitleByType(key, t)}
              </Accordion.Header>
              <Accordion.Content className={classes.accordionContent}>
                {allComponentLists[key].map((component: IToolbarElement) => (
                  <ToolbarItem
                    text={getComponentTitleByComponentType(component.type, t) || component.label}
                    icon={component.icon}
                    componentType={component.type}
                    key={component.type}
                  />
                ))}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        );
      })}
    </>
  );
}
