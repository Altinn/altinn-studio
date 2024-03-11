import React from 'react';
import { act, screen } from '@testing-library/react';
import { parsableLogicalExpression } from '../../../../testing/expressionMocks';
import { renderWithProviders } from '../../../../testing/mocks';
import { formDesignerMock } from '../../../../testing/stateMocks';
import type { IFormLayouts } from '../../../../types/global';
import { layout1NameMock, layoutMock } from '../../../../testing/layoutMock';
import type { ExpressionContentProps } from './ExpressionContent';
import { ExpressionContent } from './ExpressionContent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppContextProps } from '../../../../AppContext';
import { LogicalTupleOperator } from '@studio/components';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
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
    await act(() => user.click(orButton));
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
    renderExpressionContent({ onDelete });
    const deleteButtonName = textMock('right_menu.expression_delete');
    const deleteButton = screen.getByRole('button', { name: deleteButtonName });
    await act(() => user.click(deleteButton));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

const renderExpressionContent = (props: Partial<ExpressionContentProps> = {}) => {
  const appContextProps: Partial<AppContextProps> = { selectedLayoutSet: layoutSetName };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClient.setQueryData([QueryKey.DatamodelMetadata, org, app, layoutSetName], []);

  return renderWithProviders(<ExpressionContent {...defaultProps} {...props} />, {
    appContextProps,
    queryClient,
  });
};
