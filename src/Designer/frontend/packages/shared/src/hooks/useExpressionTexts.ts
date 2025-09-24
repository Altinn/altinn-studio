import { useTranslation } from 'react-i18next';
import type { ExpressionTexts, RelationalOperator } from '@studio/components-legacy';
import {
  ExpressionErrorKey,
  LogicalTupleOperator,
  NumberRelationOperator,
  SimpleSubexpressionValueType,
  GeneralRelationOperator,
  InstanceContext,
  PredefinedGatewayAction,
} from '@studio/components-legacy';

export const useExpressionTexts = (): ExpressionTexts => {
  const { t } = useTranslation();
  const mapArrayToTranslations = useMapArrayToTranslations();

  const valueTypeKeys = Object.values(SimpleSubexpressionValueType);
  const valueTypes = mapArrayToTranslations<SimpleSubexpressionValueType>(
    valueTypeKeys,
    (key) => `expression.valueType.${key}`,
  );

  const logicalTupleOperatorKeys = Object.values(LogicalTupleOperator);
  const logicalTupleOperators = mapArrayToTranslations<LogicalTupleOperator>(
    logicalTupleOperatorKeys,
    (key) => `expression.logicalTupleOperator.${key}`,
  );

  const errorKeys = Object.values(ExpressionErrorKey);
  const errorMessages = mapArrayToTranslations<ExpressionErrorKey>(
    errorKeys,
    (key) => `expression.error.${key}`,
  );

  const relationalOperatorKeys = [
    ...Object.values(NumberRelationOperator),
    ...Object.values(GeneralRelationOperator),
  ];
  const relationalOperators = mapArrayToTranslations<RelationalOperator>(
    relationalOperatorKeys,
    (key) => `expression.relationalOperator.${key}`,
  );

  const instanceContextKeys = Object.values(InstanceContext);
  const instanceContext = mapArrayToTranslations<InstanceContext>(
    instanceContextKeys,
    (key) => `expression.instanceContext.${key}`,
  );

  const predefinedGatewayActionKeys = Object.values(PredefinedGatewayAction);
  const predefinedGatewayActions = mapArrayToTranslations<PredefinedGatewayAction>(
    predefinedGatewayActionKeys,
    (key) => `expression.predefinedGatewayAction.${key}`,
  );

  return {
    addSubexpression: t('expression.addSubexpression'),
    and: t('expression.and'),
    andOr: t('expression.andOr'),
    cannotSaveSinceInvalid: t('expression.cannotSaveSinceInvalid'),
    cannotSimplify: t('expression.cannotSimplify'),
    changeToSimplifiedWarning: t('expression.changeToSimplifiedWarning'),
    componentId: t('expression.componentId'),
    confirmDeleteSubexpression: t('expression.confirmDeleteSubexpression'),
    dataModelPath: t('expression.dataModelPath'),
    delete: t('general.delete'),
    disabledLogicalOperator: t('expression.disabledLogicalOperator'),
    edit: t('general.edit'),
    errorListFooter: t('expression.errorListFooter'),
    errorListHeader: t('expression.errorListHeader'),
    errorMessages,
    expression: t('expression'),
    false: t('expression.false'),
    firstOperand: t('expression.firstOperand'),
    gatewayAction: t('expression.gatewayAction'),
    instanceContext,
    instanceContextKey: t('expression.instanceContextKey'),
    invalidExpression: t('expression.invalidExpression'),
    logicalOperation: t('expression.logicalOperation'),
    logicalOperator: t('expression.logicalOperator'),
    logicalTupleOperators,
    manual: t('expression.manual'),
    missingDataModelLabel: t('expression.error.missingDataModel'),
    numberValidationError: t('validation_errors.numbers_only'),
    or: t('expression.or'),
    predefinedGatewayActions,
    readonlyComponentId: t('expression.readonlyComponentId'),
    readonlyDataModelPath: t('expression.readonlyDataModelPath'),
    readonlyInstanceContext: t('expression.readonlyInstanceContext'),
    readonlyPredefinedGatewayAction: t('expression.readonlyPredefinedGatewayAction'),
    relationalOperator: t('expression.relationalOperator'),
    relationalOperators,
    save: t('general.save'),
    saveAndClose: t('expression.saveAndClose'),
    secondOperand: t('expression.secondOperand'),
    simplified: t('expression.simplified'),
    subexpression: (index: number) => t('expression.subexpression', { number: index + 1 }),
    transformToLogical: t('expression.transformToLogical'),
    true: t('expression.true'),
    value: t('expression.value'),
    valueType: t('expression.valueType'),
    valueTypes,
  };
};

type TextKeyFromCode = (code: string) => string;

const useMapArrayToTranslations = () => {
  const { t } = useTranslation();

  return <T extends string>(keyCodes: T[], textKeyFromCode: TextKeyFromCode): Record<T, string> => {
    const entries = keyCodes.map((key) => [key, t(textKeyFromCode(key))]);
    return Object.fromEntries(entries);
  };
};
