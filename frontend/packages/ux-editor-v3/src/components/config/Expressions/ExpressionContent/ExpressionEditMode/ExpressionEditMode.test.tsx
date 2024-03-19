import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  componentId,
  internalExpressionWithMultipleSubExpressions,
  internalParsableComplexExpression,
  internalUnParsableComplexExpression,
  simpleInternalExpression,
} from '../../../../../testing/expressionMocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../testing/mocks';
import { formDesignerMock } from '../../../../../testing/stateMocks';
import type { IFormLayouts } from '../../../../../types/global';
import { layout1NameMock, layoutMock } from '../../../../../testing/layoutMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  DataSource,
  ExpressionFunction,
  ExpressionPropertyBase,
  Operator,
} from '../../../../../types/Expressions';
import { deepCopy } from 'app-shared/pure';
import type { ExpressionEditModeProps } from './ExpressionEditMode';
import { ExpressionEditMode } from './ExpressionEditMode';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('ExpressionEditMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders the expression in edit mode with saveButton when complex expression is not set', () => {
    render({});

    const propertyPreviewText = screen.getByText(
      textMock('right_menu.expressions_property_preview_hidden'),
    );
    expect(propertyPreviewText).toBeInTheDocument();
    const functionSelectComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_function'),
    });
    expect(functionSelectComponent).toBeInTheDocument();
    const dataSourceSelectComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    expect(dataSourceSelectComponent).toBeInTheDocument();
    const dataSourceValueSelectComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source_value'),
    });
    expect(dataSourceValueSelectComponent).toBeInTheDocument();
    const comparableDataSourceSelectComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_comparable_data_source'),
    });
    expect(comparableDataSourceSelectComponent).toBeInTheDocument();
    const comparableDataSourceValueSelectComponent = screen.getByRole('textbox');
    expect(comparableDataSourceValueSelectComponent).toBeInTheDocument();
    expect(comparableDataSourceValueSelectComponent).toHaveValue(
      simpleInternalExpression.subExpressions[0].comparableValue as string,
    );
    const saveExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_save'),
    });
    expect(saveExpressionButton).toBeInTheDocument();
  });
  it('renders the complex expression in edit mode with save button when complex expression is set', () => {
    render({
      props: {
        expression: internalUnParsableComplexExpression,
      },
    });

    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toBeInTheDocument();
    expect(complexExpression).toHaveValue(internalUnParsableComplexExpression.complexExpression);
    expect(complexExpression).not.toHaveAttribute('disabled');
    const saveExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_save'),
    });
    expect(saveExpressionButton).toBeInTheDocument();
  });
  it('SaveExpression button is disabled when there are no function set', () => {
    render({
      props: {
        expression: {
          property: ExpressionPropertyBase.Hidden,
          subExpressions: [
            {
              dataSource: DataSource.String,
            },
          ],
        },
      },
    });
    const saveExpressionButton = screen.queryByRole('button', {
      name: textMock('right_menu.expression_save'),
    });
    expect(saveExpressionButton).toHaveAttribute('disabled');
  });
  it('saveExpression button is disabled when there are no subExpressions', () => {
    render({
      props: {
        expression: {
          property: ExpressionPropertyBase.Hidden,
        },
      },
    });
    const saveExpressionButton = screen.queryByRole('button', {
      name: textMock('right_menu.expression_save'),
    });
    expect(saveExpressionButton).toHaveAttribute('disabled');
  });
  it('calls saveExpression when saveExpression button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSaveExpression = jest.fn();
    render({
      props: {
        onSaveExpression: mockOnSaveExpression,
      },
    });
    const saveExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_save'),
    });
    await act(() => user.click(saveExpressionButton));
    expect(mockOnSaveExpression).toHaveBeenCalledWith(simpleInternalExpression);
    expect(mockOnSaveExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onDeleteExpression when deleteExpression button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDeleteExpression = jest.fn();
    render({
      props: {
        onDeleteExpression: mockOnDeleteExpression,
      },
    });
    const deleteExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    await act(() => user.click(deleteExpressionButton));
    expect(mockOnDeleteExpression).toHaveBeenCalledWith(simpleInternalExpression);
    expect(mockOnDeleteExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onSetExpression when subexpression is updated with new function', async () => {
    const user = userEvent.setup();
    const mockOnSetExpression = jest.fn();
    render({
      props: {
        onSetExpression: mockOnSetExpression,
      },
    });
    const functionDropDown = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_function'),
    });
    await act(() => user.click(functionDropDown));
    const functionOption = screen.getByRole('option', {
      name: textMock('right_menu.expressions_function_less_than'),
    });
    await act(() => user.click(functionOption));
    const simpleInternalExpressionCopy = deepCopy(simpleInternalExpression);
    simpleInternalExpressionCopy.subExpressions[0].function = ExpressionFunction.LessThan;
    expect(mockOnSetExpression).toHaveBeenCalledWith(simpleInternalExpressionCopy);
    expect(mockOnSetExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onSetExpression when subexpression is added', async () => {
    const user = userEvent.setup();
    const mockOnSetExpression = jest.fn();
    render({
      props: {
        onSetExpression: mockOnSetExpression,
      },
    });
    const addSubExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_add_sub_expression'),
    });
    await act(() => user.click(addSubExpressionButton));
    const simpleInternalExpressionCopy = deepCopy(simpleInternalExpression);
    simpleInternalExpressionCopy.subExpressions.push({});
    simpleInternalExpressionCopy.operator = Operator.And;
    expect(mockOnSetExpression).toHaveBeenCalledWith(simpleInternalExpressionCopy);
    expect(mockOnSetExpression).toHaveBeenCalledTimes(1);
  });
  it('calls onSetExpression when operator is changed', async () => {
    const user = userEvent.setup();
    const mockOnSetExpression = jest.fn();
    render({
      props: {
        expression: internalExpressionWithMultipleSubExpressions,
        onSetExpression: mockOnSetExpression,
      },
    });
    const andOperatorToggleButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_operator_and'),
    });
    await act(() => user.click(andOperatorToggleButton));
    internalExpressionWithMultipleSubExpressions.operator = Operator.And;
    expect(mockOnSetExpression).toHaveBeenCalledWith(internalExpressionWithMultipleSubExpressions);
    expect(mockOnSetExpression).toHaveBeenCalledTimes(1);
  });
  it('displays disabled free-style-editing-switch if complex expression can not be interpreted by Studio', () => {
    render({
      props: {
        expression: internalUnParsableComplexExpression,
      },
    });
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.expression_enable_free_style_editing'),
    });
    expect(enableFreeStyleEditingSwitch).toHaveAttribute('readonly');
  });
  it('displays toggled on free-style-editing-switch which is not readOnly if complex expression can be interpreted by Studio', () => {
    render({
      props: {
        expression: internalParsableComplexExpression,
      },
    });
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.expression_enable_free_style_editing'),
    });
    expect(enableFreeStyleEditingSwitch).toBeChecked();
  });
  it('displays toggled off free-style-editing-switch if expression is not complex', () => {
    render({});
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.expression_enable_free_style_editing'),
    });
    expect(enableFreeStyleEditingSwitch).not.toBeChecked();
  });
  it('toggles off free-style-editing-switch when clicked if complex expression can be interpreted by Studio', async () => {
    const user = userEvent.setup();
    render({
      props: {
        expression: internalParsableComplexExpression,
      },
    });
    const enableFreeStyleEditingSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.expression_enable_free_style_editing'),
    });
    expect(enableFreeStyleEditingSwitch).toBeChecked();
    await act(() => user.click(enableFreeStyleEditingSwitch));
    expect(enableFreeStyleEditingSwitch).not.toBeChecked();
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<ExpressionEditModeProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: ExpressionEditModeProps = {
    expression: simpleInternalExpression,
    componentName: componentId,
    onSetEditMode: jest.fn(),
    onDeleteExpression: jest.fn(),
    onDeleteSubExpression: jest.fn(),
    onSaveExpression: jest.fn(),
    onSetExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<ExpressionEditMode {...defaultProps} {...props} />);
};
