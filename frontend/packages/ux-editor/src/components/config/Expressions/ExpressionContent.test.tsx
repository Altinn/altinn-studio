import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  internalUnParsableComplexExpression,
  simpleInternalExpression,
  subExpression0
} from '../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { formDesignerMock, renderWithMockStore } from '../../../testing/mocks';
import { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';
import { ExpressionContent, ExpressionContentProps } from './ExpressionContent';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('ExpressionContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders the expression in edit mode with saveButton when complex expression is not set and the expressions id is in editMode', () => {
    render({});

    const propertySelectComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_property') });
    expect(propertySelectComponent).toBeInTheDocument();
    const functionSelectComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_function') });
    expect(functionSelectComponent).toBeInTheDocument();
    const dataSourceSelectComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source') });
    expect(dataSourceSelectComponent).toBeInTheDocument();
    const dataSourceValueSelectComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source_value') });
    expect(dataSourceValueSelectComponent).toBeInTheDocument();
    const comparableDataSourceSelectComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_comparable_data_source') });
    expect(comparableDataSourceSelectComponent).toBeInTheDocument();
    const comparableDataSourceValueSelectComponent = screen.getByRole('textbox');
    expect(comparableDataSourceValueSelectComponent).toBeInTheDocument();
    expect(comparableDataSourceValueSelectComponent).toHaveValue(simpleInternalExpression.subExpressions[0].comparableValue as string);
    const saveExpressionButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).toBeInTheDocument();
  });
  it('does not show save button when expression is in previewMode', () => {
    render({
      props: {
        expressionInEditModeId: undefined,
      }
    });

    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('renders the complex expression in edit mode with save button when complex expression is set and the expressions id is in editMode', () => {
    render({
      props: {
        expression: {
          ...internalUnParsableComplexExpression,
          id: simpleInternalExpression.id
        }
      }
    });

    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toBeInTheDocument();
    expect(complexExpression).toHaveValue(internalUnParsableComplexExpression.complexExpression);
    expect(complexExpression).not.toHaveAttribute('disabled');
    const saveExpressionButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).toBeInTheDocument();
  });
  it('renders the complex expression in preview mode when complex expression is set and the expressions id is not in editMode', () => {
    render({
      props: {
        expressionInEditModeId: undefined,
        expression: {
          ...internalUnParsableComplexExpression,
          id: simpleInternalExpression.id
        }
      }
    });

    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toBeInTheDocument();
    expect(complexExpression).toHaveValue(internalUnParsableComplexExpression.complexExpression);
    expect(complexExpression).toHaveAttribute('disabled');
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('does not show saveExpression button when there are no function set', () => {
    render({
      props: {
        expression: {
          subExpressions: [
            {
              ...subExpression0,
              function: undefined
            }
          ]
        }
      }
    });
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('does not show saveExpression button when there are no subExpressions', () => {
    render({
      props: {
        expression: {
          subExpressions: []
        }
      }
    });
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('does not show saveExpression button when expression has no property set', () => {
    render({
      props: {
        expression: {
          ...simpleInternalExpression,
          property: undefined,
        }
      }
    });
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('does not show saveExpression button when complex expression has no property set', () => {
    render({
      props: {
        expression: {
          ...internalUnParsableComplexExpression,
          property: undefined,
        }
      }
    });
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('shows successfullyAdded check mark when conditions imply for a simple expression', () => {
    render({
      props: {
        expressionInEditModeId: undefined,
        successfullyAddedExpressionId: simpleInternalExpression.id
      }
    });
    const successfullyAddedExpressionButton = screen.getByText(textMock('right_menu.expression_successfully_added_text'));
    expect(successfullyAddedExpressionButton).toBeInTheDocument();
  });
  it('does not show successfullyAdded check mark when successfullyAddedExpressionId is not the id of expression', () => {
    render({
      props: {
        expressionInEditModeId: undefined,
        successfullyAddedExpressionId: undefined
      }
    });
    const successfullyAddedExpressionButton = screen.queryByText(textMock('right_menu.expression_successfully_added_text'));
    expect(successfullyAddedExpressionButton).not.toBeInTheDocument();
  });
  it('shows successfullyAdded check mark when conditions imply for a complex expression', () => {
    render({
      props: {
        expression: {
          ...internalUnParsableComplexExpression,
          id: simpleInternalExpression.id
        },
        expressionInEditModeId: undefined,
        successfullyAddedExpressionId: simpleInternalExpression.id
      }
    });
    const successfullyAddedExpressionButton = screen.getByText(textMock('right_menu.expression_successfully_added_text'));
    expect(successfullyAddedExpressionButton).toBeInTheDocument();
  });
  it('calls saveExpression when saveExpression button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSaveExpression = jest.fn();
    render({
      props: {
        onSaveExpression: mockOnSaveExpression
      }
    });
    const saveExpressionButton = screen.getByRole('button', { name: textMock('general.save') });
    await act(() => user.click(saveExpressionButton));
    expect(mockOnSaveExpression).toHaveBeenCalledWith(simpleInternalExpression);
  });
  it('calls onRemoveExpression when deleteExpression button is clicked in editMode', async () => {
    const user = userEvent.setup();
    const mockOnRemoveExpression = jest.fn();
    render({
      props: {
        onRemoveExpression: mockOnRemoveExpression
      }
    });
    const deleteExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_delete') });
    await act(() => user.click(deleteExpressionButton));
    expect(mockOnRemoveExpression).toHaveBeenCalledWith(simpleInternalExpression);
  });
  it('calls onRemoveExpression when deleteExpression button is clicked in previewMode', async () => {
    const user = userEvent.setup();
    const mockOnRemoveExpression = jest.fn();
    render({
      props: {
        expressionInEditModeId: undefined,
        onRemoveExpression: mockOnRemoveExpression
      }
    });
    const deleteExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_delete') });
    await act(() => user.click(deleteExpressionButton));
    expect(mockOnRemoveExpression).toHaveBeenCalledWith(simpleInternalExpression);
  });
  it('calls onEditExpression when editExpression button is clicked in previewMode', async () => {
    const user = userEvent.setup();
    const mockOnEditExpression = jest.fn();
    render({
      props: {
        expressionInEditModeId: undefined,
        onEditExpression: mockOnEditExpression
      }
    });
    const editExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_edit') });
    await act(() => user.click(editExpressionButton));
    expect(mockOnEditExpression).toHaveBeenCalledWith(simpleInternalExpression);
  });
});

const render = ({ props = {}, queries = {}, }: {
  props?: Partial<ExpressionContentProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const mockOnGetProperties = jest.fn(() => ({
    availableProperties: ['readOnly', 'required'],
    expressionProperties: ['hidden', 'readOnly', 'required'],
  }));
  const defaultProps: ExpressionContentProps = {
    componentName: simpleInternalExpression.id,
    expression: simpleInternalExpression,
    onGetProperties: mockOnGetProperties,
    showRemoveExpressionButton: true,
    onSaveExpression: jest.fn(),
    successfullyAddedExpressionId: undefined,
    expressionInEditModeId: simpleInternalExpression.id,
    onUpdateExpression: jest.fn(),
    onRemoveExpression: jest.fn(),
    onRemoveSubExpression: jest.fn(),
    onEditExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore({}, queries, queryClient)(<ExpressionContent {...defaultProps} {...props} />);
};
