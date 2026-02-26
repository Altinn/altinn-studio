import React from 'react';
import { StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PolicySummary } from '../PolicySummary';
import { PolicyRulesEditor } from '../PolicyRulesEditor';

export function PolicyEditorTabs(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <StudioTabs defaultValue='summary' data-size='sm'>
      <StudioTabs.List>
        <StudioTabs.Tab value='summary'>{t('policy_editor.rules_summary')}</StudioTabs.Tab>
        <StudioTabs.Tab value='rules'>{t('policy_editor.rules_edit')}</StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Panel value='summary'>
        <PolicySummary />
      </StudioTabs.Panel>
      <StudioTabs.Panel value='rules'>
        <PolicyRulesEditor />
      </StudioTabs.Panel>
    </StudioTabs>
  );
}
