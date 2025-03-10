import React from 'react';
import { StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PolicySummary } from '../PolicySummary/PolicySummary';
import { PolicyRulesEditor } from '../PolicyRulesEditor/PolicyRulesEditor';

export function PolicyEditorTabs(): React.ReactNode {
  const { t } = useTranslation();
  return (
    <StudioTabs defaultValue={'summary'} size='small'>
      <StudioTabs.List>
        <StudioTabs.Tab value='summary'>{t('policy_editor.rules_summary')}</StudioTabs.Tab>
        <StudioTabs.Tab value='rules'>{t('policy_editor.rules_edit')}</StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content value='summary'>
        <PolicySummary />
      </StudioTabs.Content>
      <StudioTabs.Content value='rules'>
        <PolicyRulesEditor />
      </StudioTabs.Content>
    </StudioTabs>
  );
}
