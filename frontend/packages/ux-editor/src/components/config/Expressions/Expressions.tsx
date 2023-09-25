import React, { useContext, useEffect } from 'react';
import { Alert, Button } from '@digdir/design-system-react';
import { ExpressionContent } from './ExpressionContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import {
  Expression,
  SubExpression,
  getExpressionPropertiesBasedOnComponentType
} from '../../../types/Expressions';
import {
  addExpressionIfLimitNotReached,
  convertAndAddExpressionToComponent,
  deleteExpressionAndAddDefaultIfEmpty,
  deleteExpressionFromComponent, getAllConvertedExpressions,
  removeInvalidExpressions,
  removeSubExpressionAndAdaptParentProps,
} from '../../../utils/expressionsUtils';
import classes from './Expressions.module.css';
import { v4 as uuidv4 } from 'uuid';
import { Divider } from 'app-shared/primitives';
import { deepCopy } from 'app-shared/pure';
import { LayoutItemType } from '../../../types/global';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { FormContext } from '../../../containers/FormContext';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { Trans } from 'react-i18next';

export const Expressions = () => {
  const { formId, form, handleUpdate, handleSave } = useContext(FormContext);
  const [expressions, setExpressions] = React.useState<Expression[]>([]);
  const [expressionInEditModeId, setExpressionInEditModeId] = React.useState<string | undefined>(undefined);
  const [successfullyAddedExpressionIndex, setSuccessfullyAddedExpressionIndex] = React.useState<number | undefined>(undefined);
  const t = useText();
  
  useEffect(() => {
    if (form) {
      if (potentialConvertedExternalExpressions.length) {
        setExpressions(potentialConvertedExternalExpressions);
      } else {
        const defaultExpression: Expression = { id: uuidv4() };
        setExpressionInEditModeId(defaultExpression.id);
        setExpressions([defaultExpression]);
      }
    }
  }, [form])

  if (!formId || !form) return t('right_menu.content_empty');

  const potentialConvertedExternalExpressions: Expression[] = getAllConvertedExpressions(form);
  const updateAndSaveLayout = async (updatedComponent: FormComponent | FormContainer) => {
    handleUpdate(updatedComponent);
    await handleSave(formId, updatedComponent);
  }

  // adapt list of actions if component is group
  const expressionProperties = getExpressionPropertiesBasedOnComponentType(form.itemType as LayoutItemType);
  const showRemoveExpressionButton = expressions?.length > 1 || !!expressions[0]?.property;
  const isExpressionLimitReached = expressions?.length >= expressionProperties?.length;

  const saveExpressionAndSetCheckMark = async (index: number, expression: Expression) => {
    const updatedComponent = convertAndAddExpressionToComponent(form, expression);
    await updateAndSaveLayout(updatedComponent);
    // Need to use index as expression reference since the id will be changed when the component is updated.
    setSuccessfullyAddedExpressionIndex(index);
    setExpressionInEditModeId(undefined);
  };

  const addNewExpression = async () => {
    // TODO: Check if expression is in edit mode and try to save?
    const validExpressions = removeInvalidExpressions(expressions);
    const newExpressions = addExpressionIfLimitNotReached(
      validExpressions,
      isExpressionLimitReached
    );
    setExpressionInEditModeId(newExpressions[newExpressions.length - 1].id);
    setExpressions(newExpressions);
  };

  const updateExpression = (index: number, newExpression: Expression) => {
    const newExpressions = deepCopy(expressions);
    newExpressions[index] = newExpression;
    setExpressions(newExpressions);
  };

  const editExpression = (expression: Expression) => {
    // TODO: Check if expression is in edit mode and try to save?
    const validExpressions = removeInvalidExpressions(expressions);
    setExpressionInEditModeId(expression.id);
    setExpressions(validExpressions);
  };

  const deleteExpression = async (expression: Expression) => {
    const newExpressions = deleteExpressionAndAddDefaultIfEmpty(expression, expressions);
    const updatedComponent = deleteExpressionFromComponent(form, expression);
    await updateAndSaveLayout(updatedComponent);
    if (newExpressions.length === 1 && !newExpressions[0].property) {
      // Set default expression as expression in edit mode if it has been added
      setExpressionInEditModeId(newExpressions[0].id);
    } else if (expressionInEditModeId !== expression.id) {
      setExpressionInEditModeId(expressionInEditModeId);
    } else {
      // Unset expression in edit mode if expression to delete was in edit mode
      setExpressionInEditModeId(undefined);
    }
    setExpressions(newExpressions);
  };

  const deleteSubExpression = async (index: number, subExpression: SubExpression, expression: Expression) => {
    const newExpression = removeSubExpressionAndAdaptParentProps(expression, subExpression);
    const updatedComponent = convertAndAddExpressionToComponent(form, newExpression);
    await updateAndSaveLayout(updatedComponent);
    updateExpression(index, newExpression);
  };

  const getProperties = (expression: Expression) => {
    const alreadyUsedProperties = expressions.map((prevExpression) => {
      if (expression !== prevExpression) return prevExpression.property;
    }) as string[];
    const availableProperties = expressionProperties.filter(
      (expressionProperty) => !Object.values(alreadyUsedProperties).includes(expressionProperty)
    );
    return { availableProperties, expressionProperties };
  };


  console.log('expressions: ', expressions) // TODO: Remove when fully tested
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
        <React.Fragment key={expression.id}>
          <ExpressionContent
            componentName={form.id}
            expression={expression}
            onGetProperties={() => getProperties(expression)}
            showRemoveExpressionButton={showRemoveExpressionButton}
            onSaveExpression={() => saveExpressionAndSetCheckMark(index, expression)}
            successfullyAddedExpression={index === successfullyAddedExpressionIndex}
            expressionInEditMode={expression.id === expressionInEditModeId}
            onUpdateExpression={newExpression => updateExpression(index, newExpression)}
            onRemoveExpression={() => deleteExpression(expression)}
            onRemoveSubExpression={(subExpression) => deleteSubExpression(index, subExpression, expression)}
            onEditExpression={() => editExpression(expression)}
          />
        </React.Fragment>
      ))}
      {isExpressionLimitReached ? (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.expressions_expressions_limit_reached_alert')}
        </Alert>
      ) : (
        <Button
          title={t('right_menu.expressions_add')}
          color='primary'
          fullWidth
          icon={<PlusIcon />}
          id='right_menu.dynamics_add'
          onClick={addNewExpression}
          size='small'
          variant='outline'
        >
          {t('right_menu.expressions_add')}
        </Button>
      )}
    </div>
  );
};
