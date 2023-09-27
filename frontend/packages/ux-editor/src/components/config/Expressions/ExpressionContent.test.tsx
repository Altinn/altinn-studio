import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  internalParsableComplexExpression,
  internalUnParsableComplexExpression,
  simpleInternalExpression,
  subExpression0
} from '../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../testing/mocks';
import { formDesignerMock } from '../../../testing/stateMocks';
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
        expressionInEditMode: false,
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
        expressionInEditMode: false,
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
        expressionInEditMode: false,
        successfullyAddedExpression: true
      }
    });
    const successfullyAddedExpressionButton = screen.getByText(textMock('right_menu.expression_successfully_added_text'));
    expect(successfullyAddedExpressionButton).toBeInTheDocument();
  });
  it('does not show successfullyAdded check mark when successfullyAddedExpressionId is not the id of expression', () => {
    render({
      props: {
        expressionInEditMode: false,
        successfullyAddedExpression: false
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
        expressionInEditMode: false,
        successfullyAddedExpression: true,
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
    expect(mockOnSaveExpression).toHaveBeenCalledTimes(1);
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
    expect(mockOnRemoveExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onRemoveExpression when deleteExpression button is clicked in previewMode', async () => {
    const user = userEvent.setup();
    const mockOnRemoveExpression = jest.fn();
    render({
      props: {
        expressionInEditMode: false,
        onRemoveExpression: mockOnRemoveExpression
      }
    });
    const deleteExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_delete') });
    await act(() => user.click(deleteExpressionButton));
    expect(mockOnRemoveExpression).toHaveBeenCalledWith(simpleInternalExpression);
    expect(mockOnRemoveExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onEditExpression when editExpression button is clicked in previewMode', async () => {
    const user = userEvent.setup();
    const mockOnEditExpression = jest.fn();
    render({
      props: {
        expressionInEditMode: false,
        onEditExpression: mockOnEditExpression
      }
    });
    const editExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_edit') });
    await act(() => user.click(editExpressionButton));
    expect(mockOnEditExpression).toHaveBeenCalledWith(simpleInternalExpression);
    expect(mockOnEditExpression).toHaveBeenCalledTimes(1);
  });
  it('displays disabled free-style-editing-switch if complex expression can not be interpreted by Studio', () => {
    render({
      props: {
        expression: internalUnParsableComplexExpression,
    }
  });
  const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', { name: textMock('right_menu.expression_enable_free_style_editing') });
  expect(enableFreeStyleEditingSwitch).toHaveAttribute('readonly');
  });
  it('displays toggled on free-style-editing-switch which is not readOnly if complex expression can be interpreted by Studio', () => {
    render({
      props: {
        expression: internalParsableComplexExpression,
      }
    });
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', { name: textMock('right_menu.expression_enable_free_style_editing') });
    expect(enableFreeStyleEditingSwitch).toHaveAttribute('checked');
  });
  it('displays toggled off free-style-editing-switch if expression is not complex', () => {
    render({});
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', { name: textMock('right_menu.expression_enable_free_style_editing') });
    expect(enableFreeStyleEditingSwitch).not.toHaveAttribute('checked');
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
    successfullyAddedExpression: false,
    expressionInEditMode: true,
    onUpdateExpression: jest.fn(),
    onRemoveExpression: jest.fn(),
    onRemoveSubExpression: jest.fn(),
    onEditExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore({}, queries, queryClient)(<ExpressionContent {...defaultProps} {...props} />);
};
