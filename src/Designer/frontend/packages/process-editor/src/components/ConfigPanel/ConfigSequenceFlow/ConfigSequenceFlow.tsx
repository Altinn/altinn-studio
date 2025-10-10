import React, { useState } from 'react';
import {
  type BooleanExpression,
  GeneralRelationOperator,
  KeyLookupFuncName,
  PredefinedGatewayAction,
  SimpleSubexpressionValueType,
  StudioExpression,
} from '@studio/components';
import { StudioSectionHeader, StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { Paragraph } from '@digdir/designsystemet-react';
import { BpmnExpressionModeler } from '../../../utils/bpmnModeler/BpmnExpressionModeler';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';
import { useTranslation } from 'react-i18next';
import classes from './ConfigSequenceFlow.module.css';
import { ConfigIcon } from '../../../components/ConfigPanel/ConfigContent/ConfigIcon';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';

const defaultExpression: BooleanExpression = [
  GeneralRelationOperator.Equals,
  [KeyLookupFuncName.GatewayAction],
  PredefinedGatewayAction.Reject,
];

export const ConfigSequenceFlow = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const texts = useExpressionTexts();
  const expressionModeler = new BpmnExpressionModeler(bpmnDetails.element);
  const [expression, setExpression] = useState<BooleanExpression>(
    expressionModeler.conditionExpression,
  );

  const supportedExpressionValueTypes: SimpleSubexpressionValueType[] = [
    SimpleSubexpressionValueType.CurrentGatewayAction,
    SimpleSubexpressionValueType.PredefinedGatewayAction,
  ];

  const onAddNewExpressionClicked = (): void => {
    handleOnExpressionChange(defaultExpression);
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

  const handleOnExpressionChange = (updatedExpression: BooleanExpression): void => {
    setExpression(updatedExpression);
    addExpressionToSequenceFlow(updatedExpression);
  };

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon type={BpmnTypeEnum.SequenceFlow} />}
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
            onChange={handleOnExpressionChange}
            texts={texts}
            types={supportedExpressionValueTypes}
            dataLookupOptions={undefined}
          />
        )}
      </div>
    </>
  );
};
