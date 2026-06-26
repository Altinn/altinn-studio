import { useState } from 'react';
import type { ReactNode } from 'react';

import { Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Tabs as DesignsystemetTabs } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './TabsLayout.module.css';

export interface TabsLayoutTab {
  /** Unique tab identifier */
  id: string;
  /** Text resource key for the tab title */
  title: string;
  /** Optional icon URL */
  icon?: string;
  /** Pre-rendered content for this tab panel */
  content?: ReactNode;
}

export interface TabsLayoutProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Tab definitions with pre-rendered content */
  tabs: TabsLayoutTab[];
  /** Controlled active tab ID (overrides internal state) */
  activeTab?: string;
  /** Callback when the active tab changes */
  onActiveTabChange?: (tabId: string) => void;
  /** The indexed component ID used for form-content wrapper */
  componentId?: string;
  /** Grid sizing for the inner content area */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages */
  validationGrid?: IGridStyling;
  /** Rendered validation messages */
  validationMessages?: ReactNode;
}

const sizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

export function TabsLayout({
  size = 'medium',
  tabs,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  componentId,
  innerGrid,
  validationGrid,
  validationMessages,
}: TabsLayoutProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<string | undefined>(
    controlledActiveTab ?? tabs.at(0)?.id,
  );

  // The controlled value always wins via `controlledActiveTab ?? internalActiveTab`, so internal
  // state only matters while uncontrolled. `handleChange` keeps it in sync on user interaction.
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleChange = (tabId: string) => {
    setInternalActiveTab(tabId);
    onActiveTabChange?.(tabId);
  };

  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      <DesignsystemetTabs
        defaultValue={activeTab}
        value={activeTab}
        onChange={handleChange}
        data-size={sizeMap[size]}
      >
        <DesignsystemetTabs.List>
          {tabs.map((tab) => (
            <TabHeader key={tab.id} id={tab.id} title={tab.title} icon={tab.icon} />
          ))}
        </DesignsystemetTabs.List>
        {tabs.map((tab) => {
          if (tab.id !== activeTab) {
            // Behavior changed to always render tab panels, so we override to conditionally render on
            // our side. Since we override styles, all hidden tabs were displayed after this change.
            // @see https://github.com/digdir/designsystemet/pull/3936
            return null;
          }

          return (
            <DesignsystemetTabs.Panel key={tab.id} value={tab.id} role='tabpanel'>
              <Flex container spacing={6} alignItems='flex-start'>
                {tab.content}
              </Flex>
            </DesignsystemetTabs.Panel>
          );
        })}
      </DesignsystemetTabs>
    </ComponentStructure>
  );
}

function TabHeader({ id, title, icon }: { id: string; title: string; icon?: string }) {
  const { lang } = useTranslation();

  if (icon) {
    const imgType = icon.split('.').at(-1);

    if (!imgType) {
      throw new Error(
        'Image source is missing file type. Are you sure the image source is correct?',
      );
    }
    if (!['svg', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'].includes(imgType.toLowerCase())) {
      throw new Error(
        'Only images of the types: .svg, .png, .jpg, .jpeg, .gif, .bmp, .tiff, are supported',
      );
    }
  }

  return (
    <DesignsystemetTabs.Tab key={id} value={id} tabIndex={0} className={classes.tabHeader}>
      {!!icon && <img src={icon} alt='' className={classes.icon} />}
      {lang(title)}
    </DesignsystemetTabs.Tab>
  );
}
