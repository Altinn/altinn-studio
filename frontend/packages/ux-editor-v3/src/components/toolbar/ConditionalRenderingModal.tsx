import React from 'react';
import classes from './ConditionalRenderingModal.module.css';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';
import type { IRuleModelFieldElement } from '../../types/global';
import { useTranslation } from 'react-i18next';
import {
  getAllLayoutContainers,
  getAllLayoutComponents,
  getFullLayoutOrder,
} from '../../selectors/formLayoutSelectors';
import { useRuleModelQuery } from '../../hooks/queries/useRuleModelQuery';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useRuleConfigMutation } from '../../hooks/mutations/useRuleConfigMutation';
import type { ConditionalRenderingConnection } from 'app-shared/types/RuleConfig';
import {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnection,
} from '../../utils/ruleConfigUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useAppContext } from '../../hooks/useAppContext';
import { StudioParagraph } from '@studio/components-legacy';

export function ConditionalRenderingModal() {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const { data: ruleModel } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { data: ruleConfig } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const { mutate: saveRuleConfig } = useRuleConfigMutation(org, app, selectedLayoutSet);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutContainers = getAllLayoutContainers(formLayouts);
  const layoutComponents = getAllLayoutComponents(formLayouts);
  const layoutOrder = getFullLayoutOrder(formLayouts);
  const { t } = useTranslation();

  const conditionRules = ruleModel?.filter(
    ({ type }: IRuleModelFieldElement) => type === 'condition',
  );
  const { conditionalRendering } = ruleConfig?.data ?? {};

  function handleSaveChange(id: string, connection: ConditionalRenderingConnection) {
    saveRuleConfig(addConditionalRenderingConnection(ruleConfig, id, connection));
  }

  function handleDeleteConnection(connectionId: string) {
    saveRuleConfig(deleteConditionalRenderingConnection(ruleConfig, connectionId));
  }

  function renderConditionRuleConnections(): JSX.Element {
    if (!conditionalRendering || Object.getOwnPropertyNames(conditionalRendering).length === 0) {
      return <StudioParagraph size='sm'>{t('right_menu.rules_empty')}</StudioParagraph>;
    }
    return (
      <>
        {Object.keys(conditionalRendering || {}).map((key: string) => (
          <ConditionalRenderingComponent
            key={key}
            connectionId={key}
            saveEdit={handleSaveChange}
            conditionalRendering={conditionalRendering}
            deleteConnection={handleDeleteConnection}
            formLayoutContainers={layoutContainers}
            formLayoutComponents={layoutComponents}
            order={layoutOrder}
            ruleModelElements={conditionRules}
          />
        ))}
      </>
    );
  }
  return (
    <>
      <div className={classes.header}>
        <span>{t('right_menu.rules_conditional_rendering')}</span>
        <ConditionalRenderingComponent
          saveEdit={handleSaveChange}
          conditionalRendering={conditionalRendering}
          deleteConnection={handleDeleteConnection}
          formLayoutContainers={layoutContainers}
          formLayoutComponents={layoutComponents}
          order={layoutOrder}
          ruleModelElements={conditionRules}
        />
      </div>
      {renderConditionRuleConnections()}
    </>
  );
}
