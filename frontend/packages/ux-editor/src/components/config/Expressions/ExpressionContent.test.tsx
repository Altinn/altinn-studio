import React from 'react';
import { screen } from '@testing-library/react';
import { simpleInternalExpression } from '../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { formDesignerMock, renderWithMockStore } from '../../../testing/mocks';
import { IFormLayouts } from "../../../types/global";
import { layout1NameMock, layoutMock } from "../../../testing/layoutMock";
import { ExpressionContent, ExpressionContentProps } from "./ExpressionContent";
import { textMock } from "../../../../../../testing/mocks/i18nMock";
import { createQueryClientMock } from "app-shared/mocks/queryClientMock";
import { QueryKey } from "app-shared/types/QueryKey";

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
  it('renders the complex expression in edit mode when when complex expression is set and the expressions id is in editMode', () => {

  });
  it('renders the complex expression in preview mode when complex expression is set and the expressions id is not in editMode', () => {

  });
  it('shows saveExpression button when conditions imply', () => {

  });
  it('shows successfullyAdded check mark when conditions imply', () => {

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
