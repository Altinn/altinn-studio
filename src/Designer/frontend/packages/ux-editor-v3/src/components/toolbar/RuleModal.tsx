import React from 'react';
import { RuleComponent } from '../config/RuleComponent';
import { useTranslation } from 'react-i18next';
import { useRuleModelQuery } from '../../hooks/queries/useRuleModelQuery';
import type { RuleConnection } from 'app-shared/types/RuleConfig';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useRuleConfigMutation } from '../../hooks/mutations/useRuleConfigMutation';
import { addRuleConnection, deleteRuleConnection } from '../../utils/ruleConfigUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks/useAppContext';
import { StudioParagraph } from 'libs/studio-components/src';

export function RuleModal() {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const { data: ruleConfig } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const { data: ruleModelElements } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { mutate: saveRuleConfig } = useRuleConfigMutation(org, app, selectedLayoutSet);
  const { t } = useTranslation();

  const { ruleConnection } = ruleConfig?.data ?? {};

  function handleSaveChange(id: string, connection: RuleConnection) {
    saveRuleConfig(addRuleConnection(ruleConfig, id, connection));
  }

  function handleDeleteConnection(connectionId: string) {
    saveRuleConfig(deleteRuleConnection(ruleConfig, connectionId));
  }

  function renderRuleConnections(): JSX.Element {
    if (!ruleConnection || Object.getOwnPropertyNames(ruleConnection).length === 0) {
      return <StudioParagraph>{t('right_menu.rules_empty')}</StudioParagraph>;
    }
    return (
      <>
        {Object.keys(ruleConnection || {}).map((key: string) => (
          <RuleComponent
            key={key}
            connectionId={key}
            saveEdit={handleSaveChange}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
            ruleConnection={ruleConnection}
            ruleModelElements={ruleModelElements}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <RuleComponent
        saveEdit={handleSaveChange}
        ruleConnection={ruleConnection}
        ruleModelElements={ruleModelElements}
      />
      {renderRuleConnections()}
    </>
  );
}
