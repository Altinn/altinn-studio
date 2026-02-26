import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTabs } from '@studio/components';
import { ReferenceTab } from './ReferenceTab/ReferenceTab';
import { EditTab } from './EditTab';
import type { IGenericEditComponent } from '../../../componentConfig';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import { determineInitialTab } from './utils/optionsUtils';
import classes from './OptionTabs.module.css';
import { OptionsTabKey } from './enums/OptionsTabKey';
import type { CodeListIdContextData } from './types/CodeListIdContextData';

type OptionTabsProps = {
  codeListIdContextData: CodeListIdContextData;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function OptionTabs({
  codeListIdContextData,
  component,
  handleComponentChange,
}: OptionTabsProps) {
  const initialSelectedTab = determineInitialTab(component, codeListIdContextData);
  const [selectedTab, setSelectedTab] = useState(initialSelectedTab);
  const { t } = useTranslation();

  return (
    <StudioTabs
      value={selectedTab}
      data-size='sm'
      onChange={(value) => setSelectedTab(value as OptionsTabKey)}
    >
      <StudioTabs.List>
        <StudioTabs.Tab value={OptionsTabKey.CodeList}>
          {t('ux_editor.options.tab_code_list')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={OptionsTabKey.Reference}>
          {t('ux_editor.options.tab_reference_id')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Panel className={classes.tabContent} value={OptionsTabKey.CodeList}>
        <EditTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={OptionsTabKey.Reference} className={classes.tabContent}>
        <ReferenceTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Panel>
    </StudioTabs>
  );
}
