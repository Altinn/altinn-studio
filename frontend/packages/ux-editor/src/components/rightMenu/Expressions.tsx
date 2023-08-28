import React, { useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
import { ExpressionContent } from '../config/expressions/ExpressionContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../hooks';
import { FormContext } from '../../containers/FormContext';
import {
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Expression,
} from '../../types/Expressions';
import {
  complexExpressionIsSet,
  convertExpressionToExternalFormat,
  convertExternalExpressionToInternal,
  tryParseString
} from '../../utils/expressionsUtils';
import { LayoutItemType } from '../../types/global';
import classes from './RightMenu.module.css';
import { v4 as uuidv4 } from 'uuid';
import { Divider } from 'app-shared/primitives';
import { FormComponent } from '../../types/FormComponent';
import { useUpdateFormComponentMutation } from '../../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { deepCopy } from 'app-shared/pure';

type ExpressionsProps = {
  onShowNewExpressions: (value: boolean) => void;
  showNewExpressions: boolean;
};

export const Expressions = ({ onShowNewExpressions, showNewExpressions }: ExpressionsProps) => {
  const { formId, form } = useContext(FormContext);
  const { org, app } = useParams();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSetName);
  const [expressions, setExpressions] = React.useState<Expression[]>([]);
  const t = useText();

  // adapt list of actions if component is group
  const expressionProperties = form && (form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase));

  useEffect(() => {
    if (form) {
      const propertiesWithExpressions: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] | undefined = expressionProperties && Object.keys(form).filter(property => expressionProperties.includes(property)).map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);
      const potentialConvertedExternalExpressions: Expression[] = propertiesWithExpressions?.filter(property => typeof form[property] !== 'boolean')?.map(property => convertExternalExpressionToInternal(property, form[property]));
      const defaultExpression: Expression = { id: uuidv4(), editMode: true, subExpressions: [] };
      const defaultExpressions = potentialConvertedExternalExpressions?.length === 0 ? [defaultExpression] : potentialConvertedExternalExpressions;
      setExpressions(defaultExpressions);
    }
  }, [form])

  const showRemoveExpressionButton = expressions?.length > 1;
  const successfullyAddedExpressionIdRef = useRef('default');

  if (!formId || !form) return t('right_menu.content_empty');

  const addExpression = async () => {
    // TODO: Consider have a state for expressionIdInEditMode instead of iterating over all every time to adapt the editMode prop
    const nonEditableExpressions: Expression[] = await Promise.all([...expressions.filter(prevExpression => (prevExpression.subExpressions && prevExpression.subExpressions.length > 0) || complexExpressionIsSet(prevExpression.complexExpression))].map(async prevExpression => {
      if (complexExpressionIsSet(prevExpression.complexExpression)) {
        const newExpression = tryParseString(prevExpression, prevExpression.complexExpression);
        prevExpression = { ...newExpression };
      }
      if (prevExpression.property && prevExpression.editMode) {
        // TODO: What if expression is invalid format? Have some way to validate with app-frontend dev-tools. Issue #10859
        form[prevExpression.property] = convertExpressionToExternalFormat(prevExpression);
        try {
          await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
          successfullyAddedExpressionIdRef.current = prevExpression.id;
        } catch (error) {
          successfullyAddedExpressionIdRef.current = 'default';
        }
      }
      return ({ ...prevExpression, editMode: false })
    }));
    const expression: Expression = { id: uuidv4(), editMode: true, subExpressions: [] };
    const newExpressions = expressions.length < expressionProperties.length ? nonEditableExpressions.concat(expression) : nonEditableExpressions;
    setExpressions(newExpressions);
  };

  const updateExpression = (index: number, newExpression: Expression) => {
    const updatedExpressions = deepCopy(expressions);
    updatedExpressions[index] = newExpression;
    setExpressions(updatedExpressions);
  }

  const editExpression = (expression: Expression) => {
    // TODO: Consider have a state for expressionIdInEditMode instead of iterating over all every time to adapt the editMode prop
    // Set editMode fields for all prev expressions to false
    const updatedExpressions = [...expressions.filter(prevExpression => (prevExpression.subExpressions && prevExpression.subExpressions.length > 0) || prevExpression.complexExpression)].map(prevExpression => {
      if (prevExpression === expression) return { ...prevExpression, editMode: true }
      else return { ...prevExpression, editMode: false }
    });
    setExpressions(updatedExpressions);
  };

  const removeExpression = async (expression: Expression) => {
    if (expression.property) {
      // TODO: What if the property was set to true or false before? Issue #10860
      delete form[expression.property];
      await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
    }
    const defaultExpression: Expression = { id: uuidv4(), editMode: true, subExpressions: [] };
    const newExpressions = expressions.length === 1 ? expressions.filter(prevExpression => prevExpression !== expression).concat(defaultExpression) : expressions.filter(prevExpression => prevExpression !== expression);
    setExpressions(newExpressions)
  };

  const getProperties = (expression: Expression) => {
    const alreadyUsedProperties = expressions.map(prevExpression => {
      if (expression !== prevExpression) return prevExpression.property
    }) as string[];
    const availableProperties = expressionProperties.filter(expressionProperty => !Object.values(alreadyUsedProperties).includes(expressionProperty));
    return { availableProperties, expressionProperties }
  };

  console.log('expressions: ', expressions)
  return (
    <div className={classes.expressions}>
      {Object.values(expressions).map((expression: Expression, index: number) => (
        <div key={expression.id}>
          <ExpressionContent
            component={form}
            expression={expression}
            onGetProperties={() => getProperties(expression)}
            showRemoveExpressionButton={showRemoveExpressionButton}
            onAddExpression={addExpression}
            successfullyAddedExpressionId={successfullyAddedExpressionIdRef.current}
            onUpdateExpression={newExpression => updateExpression(index, newExpression)}
            onRemoveExpression={() => removeExpression(expression)}
            onEditExpression={() => editExpression(expression)}
          />
        </div>
      ))}
      {expressions.length < expressionProperties.length ? (
        <Button
          aria-label={t('right_menu.dynamics_add')}
          color='primary'
          fullWidth
          icon={<PlusIcon/>}
          id='right_menu.dynamics_add'
          onClick={addExpression}
          size='small'
          variant='outline'
        >
          {t('right_menu.dynamics_add')}
        </Button>
      ) : (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.dynamics_dynamics_limit_reached_alert')}
        </Alert>
      )}
      {shouldDisplayFeature('expressions') &&
        (<div className={classes.expressionsVersionCheckBox}>
          <Divider/>
          <LegacyCheckbox
            label={t('right_menu.show_new_dynamics')}
            name={'checkbox-name'}
            checked={showNewExpressions}
            onChange={() => onShowNewExpressions(!showNewExpressions)}
          />
        </div>)
      }
    </div>
  )
};
