import React from 'react';
import { screen } from '@testing-library/react';
import { parsableLogicalExpression } from '../../../testing/expressionMocks';
import { renderWithProviders } from '../../../testing/mocks';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { ExpressionContentProps } from './ExpressionContent';
import { ExpressionContent } from './ExpressionContent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppContextProps } from '../../../AppContext';
import { LogicalTupleOperator } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
const dataModelName = undefined;
const heading = 'Test';
const defaultProps: ExpressionContentProps = {
  expression: null,
  onChange: jest.fn(),
  onDelete: jest.fn(),
  heading,
};

describe('ExpressionContent', () => {
  it('Renders a fieldset with the given heading', () => {
    renderExpressionContent();
    screen.getByRole('group', { name: heading });
  });

  it('Renders the expression', () => {
    renderExpressionContent({ expression: parsableLogicalExpression });
    screen.getByRole('group', { name: textMock('expression.logicalOperation') });
  });

  it('Calls the onChange function with the updated expression when the user changes something in the expression', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderExpressionContent({ expression: parsableLogicalExpression, onChange });
    const orButtonName = textMock('expression.logicalTupleOperator.or');
    const orButton = screen.getByRole('radio', { name: orButtonName });
    await user.click(orButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      LogicalTupleOperator.Or,
      ...parsableLogicalExpression.slice(1),
    ]);
  });

  it('Calls the onDelete function when the user clicks the delete button and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const onDelete = jest.fn();
    renderExpressionContent({ onDelete, expression: parsableLogicalExpression });
    const deleteButtonName = textMock('right_menu.expression_delete');
    const deleteButton = screen.getByRole('button', { name: deleteButtonName });
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Show delete button when existing an expression', async () => {
    renderExpressionContent({ expression: parsableLogicalExpression });
    screen.getByRole('button', { name: textMock('right_menu.expression_delete') });
  });

  it('Do not show delete button if there is no expression', async () => {
    renderExpressionContent();
    expect(
      screen.queryByRole('button', { name: textMock('right_menu.expression_delete') }),
    ).not.toBeInTheDocument();
  });
});

const renderExpressionContent = (props: Partial<ExpressionContentProps> = {}) => {
  const appContextProps: Partial<AppContextProps> = { selectedFormLayoutSetName: layoutSetName };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClient.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSetName, dataModelName],
    [],
  );

  return renderWithProviders(<ExpressionContent {...defaultProps} {...props} />, {
    appContextProps,
    queryClient,
  });
};
