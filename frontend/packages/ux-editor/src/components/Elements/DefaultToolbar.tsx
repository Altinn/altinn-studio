import React from 'react';
import type { IToolbarElement } from '../../types/global';
import { CollapsableMenus } from '../../types/global';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Accordion } from '@digdir/designsystemet-react';
import { getCollapsableMenuTitleByType } from '../../utils/language';
import { ToolbarItem } from './ToolbarItem';
import { useComponentTitle } from '@altinn/ux-editor/hooks';

export const DefaultToolbar = () => {
  const { t } = useTranslation();
  const getComponentTitle = useComponentTitle();
  const componentList: IToolbarElement[] = schemaComponents.map(mapComponentToToolbarElement);
  const textComponentList: IToolbarElement[] = textComponents.map(mapComponentToToolbarElement);
  const advancedComponentsList: IToolbarElement[] = advancedItems.map(mapComponentToToolbarElement);

  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
  };

  return Object.values(CollapsableMenus).map((key: CollapsableMenus) => {
    return (
      <Accordion key={key}>
        <Accordion.Item
          defaultOpen={key === CollapsableMenus.Components}
          className={classes.accordionItem}
        >
          <Accordion.Header className={classes.accordionHeader} level={3}>
            {getCollapsableMenuTitleByType(key, t)}
          </Accordion.Header>
          <Accordion.Content className={classes.accordionContent}>
            {allComponentLists[key].map((component: IToolbarElement) => (
              <ToolbarItem
                componentTitle={getComponentTitle(component)}
                icon={component.icon}
                componentType={component.type}
                key={component.type}
              />
            ))}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    );
  });
};
