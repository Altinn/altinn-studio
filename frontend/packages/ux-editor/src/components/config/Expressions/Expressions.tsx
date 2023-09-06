import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
import { ExpressionContent } from './ExpressionContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import {
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Expression,
} from '../../../types/Expressions';
import {
  addExpressionIfLimitNotReached, convertAndAddExpressionToComponent,
  convertExternalExpressionToInternal,
  deleteExpressionAndAddDefaultIfEmpty, removeInvalidExpressions,
} from '../../../utils/expressionsUtils';
import { LayoutItemType } from '../../../types/global';
import classes from './Expressions.module.css';
import { v4 as uuidv4 } from 'uuid';
import { Divider } from 'app-shared/primitives';
import { useUpdateFormComponentMutation } from '../../../hooks/mutations/useUpdateFormComponentMutation';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../../selectors/formLayoutSelectors';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { deepCopy } from 'app-shared/pure';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export type ExpressionsProps = {
  onShowNewExpressions: (value: boolean) => void;
  showNewExpressions: boolean;
};

export const Expressions = ({ onShowNewExpressions, showNewExpressions }: ExpressionsProps) => {
  const { formId, form } = useFormContext();
  const { org, app } = useStudioUrlParams();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { mutate: updateFormComponent } = useUpdateFormComponentMutation(
    org,
    app,
    selectedLayoutName,
    selectedLayoutSetName
  );
  const [expressions, setExpressions] = React.useState<Expression[]>([]);
  const [expressionInEditModeId, setExpressionInEditModeId] = React.useState<string | undefined>(
    undefined
  );
  const t = useText();

  // adapt list of actions if component is group
  const expressionProperties =
    form &&
    (form.itemType === LayoutItemType.Container
      ? (Object.values(ExpressionPropertyBase) as string[]).concat(
          Object.values(ExpressionPropertyForGroup) as string[]
        )
      : Object.values(ExpressionPropertyBase));

  const propertiesWithExpressions: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] | undefined = expressionProperties &&
    Object.keys(form)
      .filter(property => expressionProperties.includes(property))
      .map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);

  useEffect(() => {
    if (form) {
      const potentialConvertedExternalExpressions: Expression[] =
        propertiesWithExpressions?.filter(property => typeof form[property] !== 'boolean')?.map(property => convertExternalExpressionToInternal(property, form[property]));
      // Check if there was no existing expressions
      if (potentialConvertedExternalExpressions?.length === 0) {
        const defaultExpression: Expression = { id: uuidv4() };
        setExpressionInEditModeId(defaultExpression.id);
        setExpressions([defaultExpression]);
      } else {
        setExpressions(potentialConvertedExternalExpressions);
      }
    }
  }, [form, propertiesWithExpressions])

  const successfullyAddedExpressionIdRef = useRef('default');
  const showRemoveExpressionButton = expressions?.length > 1 || !!expressions[0]?.property;
  const isExpressionLimitReached = expressions?.length >= expressionProperties?.length;

  if (!formId || !form) return t('right_menu.content_empty');

  const saveExpressionAndSetCheckMark = async (expression: Expression) => {
    const updatedComponent = convertAndAddExpressionToComponent(form, formId, expression);
    await updateFormComponent({ updatedComponent, id: formId });
    setExpressionInEditModeId(undefined);
    successfullyAddedExpressionIdRef.current = expression.id;
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
    const validExpression = removeInvalidExpressions(expressions);
    setExpressionInEditModeId(expression.id);
    setExpressions(validExpression);
  };

  const deleteExpression = async (expression: Expression) => {
    const { updatedComponent, updatedExpressions } = deleteExpressionAndAddDefaultIfEmpty(form, expression, expressions);
    await updateFormComponent({ updatedComponent, id: formId });
    if (updatedExpressions.length === 1 && !updatedExpressions[0].property) {
      // Set default expression as expression in edit mode if it has been added
      setExpressionInEditModeId(updatedExpressions[0].id);
    } else if (expressionInEditModeId !== expression.id) {
      setExpressionInEditModeId(expressionInEditModeId);
    } else {
      // Unset expression in edit mode if expression to delete was in edit mode
      setExpressionInEditModeId(undefined);
    }
    setExpressions(updatedExpressions);
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
      {Object.values(expressions).map((expression: Expression, index: number) => (
        <div key={expression.id}>
          <ExpressionContent
            component={form}
            expression={expression}
            onGetProperties={() => getProperties(expression)}
            showRemoveExpressionButton={showRemoveExpressionButton}
            onSaveExpression={() => saveExpressionAndSetCheckMark(expression)}
            successfullyAddedExpressionId={successfullyAddedExpressionIdRef.current}
            expressionInEditModeId={expressionInEditModeId}
            onUpdateExpression={(newExpression) => updateExpression(index, newExpression)}
            onRemoveExpression={() => deleteExpression(expression)}
            onEditExpression={() => editExpression(expression)}
          />
        </div>
      ))}
      {isExpressionLimitReached ? (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.expressions_expressions_limit_reached_alert')}
        </Alert>
      ) : (
        <Button
          aria-label={t('right_menu.expressions_add')}
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
      {shouldDisplayFeature('expressions') && (
        <div className={classes.expressionsVersionCheckBox}>
          <Divider />
          <LegacyCheckbox
            label={t('right_menu.show_new_dynamics')}
            name={'checkbox-name'}
            checked={showNewExpressions}
            onChange={() => onShowNewExpressions(!showNewExpressions)}
          />
        </div>
      )}
    </div>
  );
};
