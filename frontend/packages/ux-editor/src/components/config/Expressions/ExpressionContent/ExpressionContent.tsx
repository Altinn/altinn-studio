import React, { useContext, useState } from 'react';
import { Expression, SubExpression, ExpressionProperty } from '../../../../types/Expressions';
import {
  convertExternalExpressionToInternal,
  convertAndAddExpressionToComponent,
  removeSubExpression,
  deleteExpressionFromPropertyOnComponent,
  getExternalExpressionOnComponentProperty,
} from '../../../../utils/expressionsUtils';
import { FormComponent } from '../../../../types/FormComponent';
import { FormContainer } from '../../../../types/FormContainer';
import { FormContext } from '../../../../containers/FormContext';
import { ExpressionPreview } from './ExpressionPreview';
import { ExpressionEditMode } from './ExpressionEditMode';

export interface ExpressionContentProps {
  property: ExpressionProperty;
  defaultEditMode: boolean;
  onDeleteExpression: (property: ExpressionProperty) => void;
}

export const ExpressionContent = ({
  property,
  defaultEditMode,
  onDeleteExpression,
}: ExpressionContentProps) => {
  const { formId, form, handleUpdate, handleSave } = useContext(FormContext);
  const externalExpression = getExternalExpressionOnComponentProperty(form, property);
  const defaultExpression = externalExpression
    ? convertExternalExpressionToInternal(property, externalExpression)
    : { property };
  const [expression, setExpression] = useState<Expression>(defaultExpression);
  const [editMode, setEditMode] = useState<boolean>(defaultEditMode);

  const updateAndSaveLayout = async (updatedComponent: FormComponent | FormContainer) => {
    handleUpdate(updatedComponent);
    await handleSave(formId, updatedComponent);
  };

  const saveExpression = async (exp: Expression) => {
    const updatedComponent = convertAndAddExpressionToComponent(form, exp);
    await updateAndSaveLayout(updatedComponent);
  };

  const deleteExpression = async (exp: Expression) => {
    const updatedComponent = deleteExpressionFromPropertyOnComponent(form, exp.property);
    await updateAndSaveLayout(updatedComponent);
    onDeleteExpression(exp.property);
  };

  const deleteSubExpression = async (subExpression: SubExpression) => {
    const newExpression: Expression = removeSubExpression(expression, subExpression);
    const updatedComponent = convertAndAddExpressionToComponent(form, newExpression);
    await updateAndSaveLayout(updatedComponent);
    setExpression(newExpression);
  };

  return editMode ? (
    <ExpressionEditMode
      expression={expression}
      componentName={formId}
      onSetEditMode={setEditMode}
      onDeleteExpression={deleteExpression}
      onDeleteSubExpression={deleteSubExpression}
      onSaveExpression={saveExpression}
      onSetExpression={setExpression}
    />
  ) : (
    <ExpressionPreview
      expression={expression}
      componentName={formId}
      onSetEditMode={setEditMode}
      onDeleteExpression={deleteExpression}
    />
  );
};
