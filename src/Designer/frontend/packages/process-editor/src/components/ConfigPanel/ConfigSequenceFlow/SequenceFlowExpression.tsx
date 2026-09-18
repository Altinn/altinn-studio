import type { ReactElement } from 'react';
import {
  StudioButton,
  StudioExpression,
  StudioTextarea,
  SimpleSubexpressionValueType,
  GeneralRelationOperator,
  KeyLookupFuncName,
  type BooleanExpression,
} from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { usePropState } from '@studio/hooks';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export function SequenceFlowExpression(): ReactElement {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const texts = useExpressionTexts();
  const [serialized, setSerialized] = usePropState(
    bpmnDetails.element.businessObject?.conditionExpression?.body ?? 'null',
  );
  let expression: BooleanExpression;
  try {
    expression = JSON.parse(serialized);
  } catch {
    return (
      <StudioTextarea
        label={texts.expression}
        error={texts.invalidExpression}
        value={serialized}
        readOnly
      />
    );
  }
  const update = (value: BooleanExpression): void => {
    setSerialized(JSON.stringify(value));
    const factory = modelerRef.current.get<BpmnFactory>('bpmnFactory');
    modelerRef.current.get<Modeling>('modeling').updateProperties(bpmnDetails.element, {
      conditionExpression:
        value === null
          ? undefined
          : factory.create('bpmn:FormalExpression', { body: JSON.stringify(value) }),
    });
  };
  return expression === null ? (
    <StudioButton
      variant='secondary'
      icon={<PlusIcon />}
      onClick={() =>
        update([GeneralRelationOperator.Equals, [KeyLookupFuncName.GatewayAction], 'reject'])
      }
    >
      {t('process_editor.sequence_flow_configuration_add_new_rule')}
    </StudioButton>
  ) : (
    <StudioExpression
      showAddSubexpression={false}
      expression={expression}
      onChange={update}
      texts={texts}
      types={[
        SimpleSubexpressionValueType.CurrentGatewayAction,
        SimpleSubexpressionValueType.PredefinedGatewayAction,
      ]}
      dataLookupOptions={undefined}
    />
  );
}
