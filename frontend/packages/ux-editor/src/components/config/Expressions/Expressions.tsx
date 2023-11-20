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

export const Expressions = () => {
  const { formId, form, handleUpdate, handleSave } = useContext(FormContext);
  const [expressions, setExpressions] = React.useState<Expression[]>([]);
  const [successfullyAddedExpressionProperty, setSuccessfullyAddedExpressionProperty] =
    React.useState<ExpressionProperty | undefined>(undefined);
  const t = useText();

  useEffect(() => {
    if (form) {
      const convertedExpressions: Expression[] = getAllConvertedExpressions(form);
      setExpressions(convertedExpressions.length ? convertedExpressions : []);
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
  const alreadyUsedProperties = expressions.map((expression) => expression.property);
  const isExpressionLimitReached = expressions?.length >= expressionProperties?.length;

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
  };

  const addNewExpression = async (property: ExpressionProperty) => {
    const newExpressions = addExpressionIfLimitNotReached(
      expressions,
      property,
      isExpressionLimitReached,
    );
    setExpressions(newExpressions);
  };

  const updateExpression = (index: number, newExpression: Expression) => {
    const newExpressions: Expression[] = deepCopy(expressions);
    newExpression[index] = newExpression;
    setExpressions(newExpressions);
  };

  const removeExpression = async (expression: Expression) => {
    const newExpressions: Expression[] = deleteExpression(expression, expressions);
    const updatedComponent = deleteExpressionFromComponent(form, expression);
    await updateAndSaveLayout(updatedComponent);
    setExpressions(newExpressions);
  };

  const deleteSubExpression = async (
    index: number,
    subExpression: SubExpression,
    expression: Expression,
  ) => {
    const newExpression: Expression = removeSubExpression(expression, subExpression);
    const updatedComponent = convertAndAddExpressionToComponent(form, newExpression);
    await updateAndSaveLayout(updatedComponent);
    updateExpression(index, newExpression);
  };

  const getProperties = (): string[] => {
    return getNonOverlappingElementsFromTwoLists(expressionProperties, alreadyUsedProperties);
  };

  return (
    <div className={classes.root}>
      <Trans i18nKey={'right_menu.read_more_about_expressions'}>
        <a
          href={altinnDocsUrl('altinn-studio/designer/build-app/expressions')}
          target='_newTab'
          rel='noopener noreferrer'
        />
      </Trans>
      {Object.values(expressions).map((expression: Expression, index: number) => (
        <ExpressionContent
          key={expression.property}
          componentName={form.id}
          expression={expression}
          onGetProperties={getProperties}
          onSaveExpression={() => saveExpressionAndSetCheckMark(index, expression)}
          successfullyAddedExpression={expression.property === successfullyAddedExpressionProperty}
          onUpdateExpression={(newExpression) => updateExpression(index, newExpression)}
          onRemoveExpression={() => removeExpression(expression)}
          onRemoveSubExpression={(subExpression) =>
            deleteSubExpression(index, subExpression, expression)
          }
        />
      ))}
      {isExpressionLimitReached ? (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.expressions_expressions_limit_reached_alert')}
        </Alert>
      ) : (
        <>
          {expressions.length === 0 && (
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
