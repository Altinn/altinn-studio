import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { render, screen, within } from '@testing-library/react';
import type { Expression, LogicalTupleFunc } from './types/Expression';
import { dataLookupOptions } from './test-data/dataLookupOptions';
import { texts } from './test-data/texts';
import { StudioExpression } from './StudioExpression';
import {
  generalOperatorRelation,
  logicalExpression,
  numberOperatorRelation,
  tooComplexExpression,
} from './test-data/expressions';
import userEvent from '@testing-library/user-event';
import { GeneralRelationOperator } from './enums/GeneralRelationOperator';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';
import { expressionToString } from '../StudioManualExpression/converters';
import { LogicalTupleOperator } from './enums/LogicalTupleOperator';

const onChange = vi.fn();

describe('StudioExpression', () => {
  afterEach(vi.clearAllMocks);

  it('Renders with the simpified tab open when the expression is simplifiable', () => {
    renderExpression(logicalExpression);
    expect(screen.getByRole('tab', { name: texts.simplified })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Renders with the manual tab open when the expression is not simplifiable', () => {
    renderExpression(tooComplexExpression);
    expect(screen.getByRole('tab', { name: texts.manual })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    screen.getByRole('textbox', { name: texts.expression });
  });

  it('Displays an information message when the expression is not simplifiable and the user opens the simplified editor', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(screen.getByText(texts.cannotSimplify)).toBeInTheDocument();
  });

  it.each([true, false])(
    'Renders a boolean toggle correctly when the expression is %s',
    (expression) => {
      renderExpression(expression);
      expect(screen.getByRole('group')).toBeInTheDocument();
      if (expression) {
        expect(screen.getByRole('radio', { name: texts.true })).toBeChecked();
      } else {
        expect(screen.getByRole('radio', { name: texts.false })).toBeChecked();
      }
    },
  );

  it.each([true, false])(
    'Calls the onChange function with the new boolean when the original expression is %s and the user checks the other one',
    async (expression) => {
      const user = userEvent.setup();
      renderExpression(expression);
      await user.click(screen.getByRole('radio', { name: expression ? texts.false : texts.true }));

      expect(onChange).toHaveBeenCalledWith(!expression);
    },
  );

  it('Calls the onChange function with the default expression when the expression is a boolean and the user clicks the transform button', async () => {
    const user = userEvent.setup();
    renderExpression(true);
    await user.click(screen.getByRole('button', { name: texts.transformToLogical }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([GeneralRelationOperator.Equals, 0, 0]);
  });

  it('Renders an empty logical expression when the provided expression is null', () => {
    renderExpression(null);
    const logicalExpressionGroup = screen.getByRole('group', { name: texts.logicalOperation });
    expect(within(logicalExpressionGroup).queryByRole('group')).not.toBeInTheDocument();
  });

  it('Renders a logical expression with one subexression when the provided expression is a simple relational expression', () => {
    renderExpression(generalOperatorRelation);
    const logicalExpressionGroup = screen.getByRole('group', { name: texts.logicalOperation });
    within(logicalExpressionGroup).getByRole('group', { name: texts.subexpression(0) });
  });

  it.each(Object.values(LogicalTupleOperator))(
    'Renders all sub-expressions when the logical operator is %s',
    (operator) => {
      const subexpressions = logicalExpression.slice(1);
      const expression: LogicalTupleFunc = [operator, ...subexpressions] as LogicalTupleFunc;
      renderExpression(expression);
      const logicalExpressionGroup = screen.getByRole('group', { name: texts.logicalOperation });
      subexpressions.forEach((_, index) => {
        within(logicalExpressionGroup).getByRole('group', { name: texts.subexpression(index) });
      });
    },
  );

  it('Renders add subexpression button', () => {
    renderExpression(logicalExpression);
    screen.getByRole('button', { name: texts.addSubexpression });
  });

  it('Renders a message when the expression is invalid', () => {
    const invalidExpression = ['something invalid'];
    renderExpression(invalidExpression as Expression);
    screen.getByText(texts.invalidExpression);
  });

  it('Calls the onChange function with the new expression when the user adds a subexpression', async () => {
    const user = userEvent.setup();
    renderExpression(logicalExpression);
    await user.click(screen.getByRole('button', { name: texts.addSubexpression }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      ...logicalExpression,
      [GeneralRelationOperator.Equals, 0, 0],
    ]);
  });

  it('Calls the onChange function with the new expression when the user removes a subexpression', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderExpression(logicalExpression);
    const subexpressionToDelete = screen.getByRole('group', { name: texts.subexpression(0) });
    const deleteButton = within(subexpressionToDelete).getByRole('button', { name: texts.delete });
    await user.click(deleteButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(numberOperatorRelation);
  });

  it('Renders the sub-expression in view mode by default', () => {
    renderExpression(generalOperatorRelation);
    screen.getByRole('button', { name: texts.edit });
  });

  it('Switches the sub-expression to edit mode when the user clicks the edit button', async () => {
    const user = userEvent.setup();
    renderExpression(generalOperatorRelation);
    const editButton = screen.getByRole('button', { name: texts.edit });
    await user.click(editButton);
    expect(screen.queryByRole('button', { name: texts.edit })).not.toBeInTheDocument();
    screen.getByRole('button', { name: texts.saveAndClose });
  });

  it('Calls the onChange function with the new expression when the user edits an operand of a subexpression', async () => {
    const user = userEvent.setup();
    renderExpression(generalOperatorRelation);
    const editButton = screen.getByRole('button', { name: texts.edit });
    await user.click(editButton);
    const secondOperandGroup = screen.getByRole('group', { name: texts.secondOperand });
    const input = within(secondOperandGroup).getByRole('textbox', { name: texts.value });
    await user.type(input, '1');
    const saveButton = screen.getByRole('button', { name: texts.saveAndClose });
    await user.click(saveButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([...generalOperatorRelation.slice(0, 2), 'some-text1']);
  });

  it('Calls the onChange function with the new expression when the user edits the operator of a subexpression', async () => {
    const user = userEvent.setup();
    renderExpression(generalOperatorRelation);
    const editButton = screen.getByRole('button', { name: texts.edit });
    await user.click(editButton);
    const input = screen.getByRole('combobox', { name: texts.relationalOperator });
    await user.selectOptions(input, GeneralRelationOperator.NotEquals);
    const saveButton = screen.getByRole('button', { name: texts.saveAndClose });
    await user.click(saveButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      GeneralRelationOperator.NotEquals,
      ...generalOperatorRelation.slice(1),
    ]);
  });

  it('Returns back to view mode when the user clicks the save button on a subexpression', async () => {
    const user = userEvent.setup();
    renderExpression(generalOperatorRelation);
    const editButton = screen.getByRole('button', { name: texts.edit });
    await user.click(editButton);
    const saveButton = screen.getByRole('button', { name: texts.saveAndClose });
    await user.click(saveButton);
    screen.getByRole('button', { name: texts.edit });
  });

  it('Displays an error message and does not call the onChange function when the user tries to save an invalid subexpression', async () => {
    const user = userEvent.setup();
    renderExpression(numberOperatorRelation);
    const editButton = screen.getByRole('button', { name: texts.edit });
    await user.click(editButton);
    const firstOperandGroup = screen.getByRole('group', { name: texts.firstOperand });
    const typeSelect = within(firstOperandGroup).getByRole('combobox', { name: texts.valueType });
    await user.selectOptions(typeSelect, SimpleSubexpressionValueType.Boolean);
    const saveButton = screen.getByRole('button', { name: texts.saveAndClose });
    await user.click(saveButton);
    expect(onChange).not.toHaveBeenCalled();
    screen.getByText(texts.errorMessages.numericRelationOperatorWithWrongType);
  });

  it('Displays a stringified version of the expression in the manual editor', () => {
    renderExpression(tooComplexExpression);
    expect(screen.getByRole('textbox')).toHaveValue(expressionToString(tooComplexExpression));
  });

  it('Does not call the onChange function while the user types in the manual editor', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Calls the onChange function with the new expression when the user clicks the save button in the manual editor', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'true');
    await user.click(getSaveButton());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Formats the text in the manual editor when the saved expression is received', async () => {
    const user = userEvent.setup();
    const { rerender } = renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    const typedString = '["equals", 1, 1]';
    await user.clear(input);
    await user.paste(typedString);
    await user.click(getSaveButton());
    expect(input).toHaveValue(typedString);
    rerender(
      <StudioExpression
        expression={onChange.mock.lastCall[0]}
        onChange={onChange}
        dataLookupOptions={dataLookupOptions}
        texts={texts}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue(
      expressionToString([GeneralRelationOperator.Equals, 1, 1]),
    );
  });

  it('Disables the save and discard buttons in the manual editor when there are no changes', () => {
    renderExpression(tooComplexExpression);
    expect(getSaveButton()).toBeDisabled();
    expect(getDiscardButton()).toBeDisabled();
  });

  it('Disables the save button and enables the discard button when the user types an invalid expression in the manual editor', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    expect(getSaveButton()).toBeDisabled();
    expect(getDiscardButton()).toBeEnabled();
  });

  it('Resets the text in the manual editor without calling the onChange function when the user clicks the discard button', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    await user.click(getDiscardButton());
    expect(screen.getByRole('textbox')).toHaveValue(expressionToString(tooComplexExpression));
    expect(screen.queryByText(texts.cannotSaveSinceInvalid)).not.toBeInTheDocument();
    expect(getSaveButton()).toBeDisabled();
    expect(getDiscardButton()).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Asks for confirmation when the user has unsaved valid changes in the manual editor and tries to switch tab', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'true');
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(confirmSpy).toHaveBeenCalledWith(texts.changeToSimplifiedWarning);
    expect(screen.getByRole('tab', { name: texts.manual })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Switches tab without asking for confirmation when there are no unsaved changes in the manual editor', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderExpression(tooComplexExpression);
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: texts.simplified })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it.each([
    ['a valid', '["equals", 1, 1]'],
    ['an invalid', 'tru'],
  ])(
    'Displays the new expression in the manual editor when the expression is changed externally after the user has typed %s expression',
    async (_, typedString) => {
      const user = userEvent.setup();
      const { rerender } = renderExpression(tooComplexExpression);
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.paste(typedString);
      await user.tab();
      rerender(
        <StudioExpression
          expression={null}
          onChange={onChange}
          dataLookupOptions={dataLookupOptions}
          texts={texts}
        />,
      );
      expect(screen.getByRole('textbox')).toHaveValue(expressionToString(null));
      expect(screen.queryByText(texts.cannotSaveSinceInvalid)).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: texts.manual })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(getSaveButton()).toBeDisabled();
      expect(getDiscardButton()).toBeDisabled();
    },
  );

  it('Switches tab without asking for confirmation when the expression is changed externally after the user has typed in the manual editor', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { rerender } = renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    rerender(
      <StudioExpression
        expression={null}
        onChange={onChange}
        dataLookupOptions={dataLookupOptions}
        texts={texts}
      />,
    );
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: texts.simplified })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('updates the manual editor after an external expression change', () => {
    const { rerender } = renderExpression(tooComplexExpression);
    const changedExpression: Expression = [
      LogicalTupleOperator.Or,
      generalOperatorRelation,
      tooComplexExpression,
    ];
    rerender(
      <StudioExpression
        expression={changedExpression}
        onChange={onChange}
        dataLookupOptions={dataLookupOptions}
        texts={texts}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue(expressionToString(changedExpression));
  });

  it('resets invalid input after an external expression change', async () => {
    const user = userEvent.setup();
    const { rerender } = renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    rerender(
      <StudioExpression
        expression={generalOperatorRelation}
        onChange={onChange}
        dataLookupOptions={dataLookupOptions}
        texts={texts}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue(expressionToString(generalOperatorRelation));
    expect(screen.queryByText(texts.cannotSaveSinceInvalid)).not.toBeInTheDocument();
  });

  it('Does not call the onChange function and does not change the tab when the user types an invalid expression in the manual editor, tries to switch and rejects the confirm dialog', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: texts.manual })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Switches the tab without calling the onChange function when the user types an invalid expression in the manual editor, tries to switch and accepts the confirm dialog', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    await user.click(screen.getByRole('tab', { name: texts.simplified }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: texts.simplified })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Displays an error message and does not call the onChange function when the user types an invalid expression in the manual editor and blurs the textarea', async () => {
    const user = userEvent.setup();
    renderExpression(tooComplexExpression);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'tru');
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    screen.getByText(texts.cannotSaveSinceInvalid);
  });

  it('Displays all function types in the type selector by default', async () => {
    const user = userEvent.setup();
    renderExpression(generalOperatorRelation);
    await user.click(screen.getByRole('button', { name: texts.edit }));
    const typeSelector = getTypeSelectorOfFirstOperand();
    const options = within(typeSelector).getAllByRole('option');
    const types = Object.values(SimpleSubexpressionValueType);
    expect(options).toHaveLength(types.length);
    types
      .map((k) => texts.valueTypes[k])
      .forEach((name) => {
        expect(within(typeSelector).getByRole('option', { name })).toBeInTheDocument();
      });
  });

  it('Displays only selected function types in the type selector if given', async () => {
    const user = userEvent.setup();
    const selectedTypes: SimpleSubexpressionValueType[] = [
      SimpleSubexpressionValueType.Number,
      SimpleSubexpressionValueType.String,
    ];
    render(
      <StudioExpression
        dataLookupOptions={dataLookupOptions}
        expression={generalOperatorRelation}
        onChange={vi.fn()}
        texts={texts}
        types={selectedTypes}
      />,
    );
    await user.click(screen.getByRole('button', { name: texts.edit }));
    const typeSelector = getTypeSelectorOfFirstOperand();
    const options = within(typeSelector).getAllByRole('option');
    expect(options).toHaveLength(selectedTypes.length);
    selectedTypes
      .map((k) => texts.valueTypes[k])
      .forEach((name) => {
        expect(within(typeSelector).getByRole('option', { name })).toBeInTheDocument();
      });
  });
});

const renderExpression = (expression: Expression): RenderResult => {
  return render(
    <StudioExpression
      expression={expression}
      onChange={onChange}
      dataLookupOptions={dataLookupOptions}
      texts={texts}
    />,
  );
};

const getSaveButton = (): HTMLElement => screen.getByRole('button', { name: texts.save });

const getDiscardButton = (): HTMLElement => screen.getByRole('button', { name: texts.discard });

function getTypeSelectorOfFirstOperand(): HTMLElement {
  const firstOperandGroup = screen.getByRole('group', { name: texts.firstOperand });
  return within(firstOperandGroup).getByRole('combobox', { name: texts.valueType });
}
