import React, { useContext, useEffect } from 'react';
import { Alert } from '@digdir/design-system-react';
import { ExpressionContent } from './ExpressionContent';
import { useText } from '../../../hooks';
import {
  Expression,
  SubExpression,
  getExpressionPropertiesBasedOnComponentType,
  ExpressionProperty,
  expressionPropertyTexts,
} from '../../../types/Expressions';
import {
  addExpressionIfLimitNotReached,
  convertAndAddExpressionToComponent,
  deleteExpression,
  deleteExpressionFromComponent,
  getAllConvertedExpressions,
  getNonOverlappingElementsFromTwoLists,
  removeSubExpression,
} from '../../../utils/expressionsUtils';
import classes from './Expressions.module.css';
import { LayoutItemType } from '../../../types/global';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { FormContext } from '../../../containers/FormContext';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { Trans } from 'react-i18next';
import { deepCopy } from 'app-shared/pure';
import { NewExpressionButton } from './NewExpressionButton';

export interface ExpressionState {
  expression: Expression;
  editMode: boolean;
}

export const Expressions = () => {
  const { formId, form, handleUpdate, handleSave } = useContext(FormContext);
  const [expressionsState, setExpressionsState] = React.useState<ExpressionState[]>([]);
  const [successfullyAddedExpressionProperty, setSuccessfullyAddedExpressionProperty] =
    React.useState<ExpressionProperty | undefined>(undefined);
  const t = useText();

  useEffect(() => {
    if (form) {
      const convertedExpressions: Expression[] = getAllConvertedExpressions(form);
      if (convertedExpressions.length) {
        const nonEditModeExpressions: ExpressionState[] = convertedExpressions.map((exp) => {
          return { expression: exp, editMode: false };
        });
        setExpressionsState(nonEditModeExpressions);
      } else {
        setExpressionsState([]);
      }
    }
  }, [form]);

  if (!formId || !form) return t('right_menu.content_empty');

  const updateAndSaveLayout = async (updatedComponent: FormComponent | FormContainer) => {
    handleUpdate(updatedComponent);
    await handleSave(formId, updatedComponent);
  };

  const expressionProperties = getExpressionPropertiesBasedOnComponentType(
    form.itemType as LayoutItemType,
  );
  const alreadyUsedProperties = expressionsState.map(
    (expressionState) => expressionState.expression.property,
  );
  const isExpressionLimitReached = expressionsState?.length >= expressionProperties?.length;

  const availableProperties = [
    {
      label: t('right_menu.expressions_property_select'),
      value: 'default',
    },
  ].concat(
    getNonOverlappingElementsFromTwoLists(expressionProperties, alreadyUsedProperties).map(
      (property: ExpressionProperty) => ({
        label: expressionPropertyTexts(t)[property],
        value: property,
      }),
    ),
  );

  const saveExpressionAndSetCheckMark = async (index: number, expression: Expression) => {
    const updatedComponent = convertAndAddExpressionToComponent(form, expression);
    await updateAndSaveLayout(updatedComponent);
    setSuccessfullyAddedExpressionProperty(expression.property);
    const newExpressions: ExpressionState[] = expressionsState.map((expressionState) =>
      expressionState.expression === expression
        ? { ...expressionState, editMode: false }
        : expressionState,
    );
    setExpressionsState(newExpressions);
  };

  const addNewExpression = async (property: ExpressionProperty) => {
    const newExpressions = addExpressionIfLimitNotReached(
      expressionsState,
      property,
      isExpressionLimitReached,
    );
    setExpressionsState(newExpressions);
  };

  const updateExpression = (index: number, newExpression: Expression) => {
    const newExpressionsState = deepCopy(expressionsState);
    newExpressionsState[index].expression = newExpression;
    setExpressionsState(newExpressionsState);
  };

  const editExpression = (index: number) => {
    const newExpressionsState = deepCopy(expressionsState);
    newExpressionsState[index].editMode = true;
    setExpressionsState(newExpressionsState);
  };

  const removeExpression = async (expression: Expression) => {
    const newExpressionsState = deleteExpression(expression, expressionsState);
    const updatedComponent = deleteExpressionFromComponent(form, expression);
    await updateAndSaveLayout(updatedComponent);
    setExpressionsState(newExpressionsState);
  };

  const deleteSubExpression = async (
    index: number,
    subExpression: SubExpression,
    expression: Expression,
  ) => {
    const newExpression = removeSubExpression(expression, subExpression);
    const updatedComponent = convertAndAddExpressionToComponent(form, newExpression);
    await updateAndSaveLayout(updatedComponent);
    updateExpression(index, newExpression);
  };

  const getProperties = (): string[] => {
    return getNonOverlappingElementsFromTwoLists(expressionProperties, alreadyUsedProperties);
  };

  console.log('expressions: ', expressionsState); // TODO: Remove when fully tested
  return (
    <div className={classes.root}>
      <Trans i18nKey={'right_menu.read_more_about_expressions'}>
        <a
          href={altinnDocsUrl('altinn-studio/designer/build-app/expressions')}
          target='_newTab'
          rel='noopener noreferrer'
        />
      </Trans>
      {Object.values(expressionsState).map((expressionState: ExpressionState, index: number) => (
        <React.Fragment key={expressionState.expression.property}>
          <ExpressionContent
            componentName={form.id}
            expressionState={expressionState}
            onGetProperties={getProperties}
            onSaveExpression={() =>
              saveExpressionAndSetCheckMark(index, expressionState.expression)
            }
            successfullyAddedExpression={
              expressionState.expression.property === successfullyAddedExpressionProperty
            }
            onUpdateExpression={(newExpression) => updateExpression(index, newExpression)}
            onRemoveExpression={() => removeExpression(expressionState.expression)}
            onRemoveSubExpression={(subExpression) =>
              deleteSubExpression(index, subExpression, expressionState.expression)
            }
            onEditExpression={() => editExpression(index)}
          />
        </React.Fragment>
      ))}
      {isExpressionLimitReached ? (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.expressions_expressions_limit_reached_alert')}
        </Alert>
      ) : (
        <>
          {expressionsState.length === 0 && (
            <p>
              <Trans
                i18nKey={'right_menu.expressions_property_on_component'}
                values={{ componentName: form.id }}
                components={{ bold: <strong /> }}
              />
            </p>
          )}
          <NewExpressionButton
            options={availableProperties}
            onAddExpression={(property: ExpressionProperty) => addNewExpression(property)}
          />
        </>
      )}
    </div>
  );
};
