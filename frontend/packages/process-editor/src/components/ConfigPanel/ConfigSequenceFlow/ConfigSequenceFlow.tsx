import React, { useState } from 'react';
import {
  type BooleanExpression,
  GeneralRelationOperator,
  StudioButton,
  StudioExpression,
  StudioSectionHeader,
} from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { Paragraph } from '@digdir/design-system-react';
import { BpmnExpressionModeler } from '../../../utils/bpmn/BpmnExpressionModeler';
import { useExpressionTexts } from 'app-shared/components/Expression/useExpressionTexts';
import { useTranslation } from 'react-i18next';

import classes from './ConfigSequenceFlow.module.css';

const defaultExpression: BooleanExpression = [
  GeneralRelationOperator.Equals,
  ['gatewayAction'],
  'reject',
];

export const ConfigSequenceFlow = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const texts = useExpressionTexts();
  const expressionModeler = new BpmnExpressionModeler(bpmnDetails.element);
  const [expression, setExpression] = useState<BooleanExpression>(
    expressionModeler.conditionExpression,
  );

  const onAddNewExpressionClicked = (): void => {
    setExpression(defaultExpression);
  };

  const addExpressionToSequenceFlow = (expressionToAdd: BooleanExpression): void => {
    const shouldDeleteExpression = expressionToAdd === null;
    if (shouldDeleteExpression) {
      deleteExpression();
      return;
    }

    const stringifyExpression = JSON.stringify(expressionToAdd);
    const newExpressionElement = expressionModeler.createExpressionElement(stringifyExpression);

    expressionModeler.addChildElementToParent({
      conditionExpression: newExpressionElement,
    });
  };

  const deleteExpression = (): void => {
    expressionModeler.updateElementProperties({
      conditionExpression: undefined,
    });
  };

  return (
    <>
      <StudioSectionHeader
        heading={{
          text: t('process_editor.sequence_flow_configuration_panel_title'),
          level: 2,
        }}
      />
      <div className={classes.container}>
        <Paragraph spacing>
          {t('process_editor.sequence_flow_configuration_panel_explanation')}
        </Paragraph>
        {!expression ? (
          <StudioButton
            variant='secondary'
            icon={<PlusIcon />}
            fullWidth
            onClick={onAddNewExpressionClicked}
          >
            {t('process_editor.sequence_flow_configuration_add_new_rule')}
          </StudioButton>
        ) : (
          <StudioExpression
            showAddSubexpression={false}
            expression={expression}
            onChange={(updatedExpression: BooleanExpression) => {
              setExpression(updatedExpression);
              addExpressionToSequenceFlow(updatedExpression);
            }}
            texts={texts}
            expressionOptions={['gatewayAction', 'gatewayActionContext']}
            dataLookupOptions={undefined}
          />
        )}
      </div>
    </>
  );
};
