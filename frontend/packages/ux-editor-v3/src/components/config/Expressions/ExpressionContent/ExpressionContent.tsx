import React, { useContext, useState } from 'react';
import type { Expression, SubExpression, ExpressionProperty } from '../../../../types/Expressions';
import {
  convertExternalExpressionToInternal,
  convertAndAddExpressionToComponent,
  removeSubExpression,
  deleteExpressionFromPropertyOnComponent,
  getExternalExpressionOnComponentProperty,
} from '../../../../utils/expressionsUtils';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormContainer } from '../../../../types/FormContainer';
import { FormItemContext } from '../../../../containers/FormItemContext';
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
  const { formItemId, formItem, handleUpdate, handleSave } = useContext(FormItemContext);
  const externalExpression = getExternalExpressionOnComponentProperty(formItem, property);
  const defaultExpression = externalExpression
    ? convertExternalExpressionToInternal(property, externalExpression)
    : { property };
  const [expression, setExpression] = useState<Expression>(defaultExpression);
  const [editMode, setEditMode] = useState<boolean>(defaultEditMode);

  const updateAndSaveLayout = async (updatedComponent: FormComponent | FormContainer) => {
    handleUpdate(updatedComponent);
    await handleSave(formItemId, updatedComponent);
  };

  const saveExpression = async (exp: Expression) => {
    const updatedComponent = convertAndAddExpressionToComponent(formItem, exp);
    await updateAndSaveLayout(updatedComponent);
  };

  const deleteExpression = async (exp: Expression) => {
    const updatedComponent = deleteExpressionFromPropertyOnComponent(formItem, exp.property);
    await updateAndSaveLayout(updatedComponent);
    onDeleteExpression(exp.property);
  };

  const deleteSubExpression = async (subExpression: SubExpression) => {
    const newExpression: Expression = removeSubExpression(expression, subExpression);
    const updatedComponent = convertAndAddExpressionToComponent(formItem, newExpression);
    await updateAndSaveLayout(updatedComponent);
    setExpression(newExpression);
  };

  return editMode ? (
    <ExpressionEditMode
      expression={expression}
      componentName={formItemId}
      onSetEditMode={setEditMode}
      onDeleteExpression={deleteExpression}
      onDeleteSubExpression={deleteSubExpression}
      onSaveExpression={saveExpression}
      onSetExpression={setExpression}
    />
  ) : (
    <ExpressionPreview
      expression={expression}
      componentName={formItemId}
      onSetEditMode={setEditMode}
      onDeleteExpression={deleteExpression}
    />
  );
};
