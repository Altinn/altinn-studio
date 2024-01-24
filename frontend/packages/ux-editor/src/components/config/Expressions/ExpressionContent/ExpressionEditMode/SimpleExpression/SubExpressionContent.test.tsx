import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SubExpressionContentProps } from './SubExpressionContent';
import { SubExpressionContent } from './SubExpressionContent';
import {
  baseInternalSubExpression,
  componentId,
  stringValue,
  subExpression0,
} from '../../../../../../testing/expressionMocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../../testing/mocks';
import { formDesignerMock } from '../../../../../../testing/stateMocks';
import { textMock } from '../../../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layout1NameMock, layoutMock } from '../../../../../../testing/layoutMock';
import type { IFormLayouts } from '../../../../../../types/global';
import { DataSource } from '../../../../../../types/Expressions';

const user = userEvent.setup();
const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;

const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('SubExpressionContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders function select when subExpression does not have function set', () => {
    render({
      props: {
        subExpression: {},
      },
    });

    const selectElement = screen.getByRole('combobox');
    const functionSelectTitle = screen.getByText(
      textMock('right_menu.expressions_function_on_property'),
    );
    expect(selectElement).toBeInTheDocument();
    expect(functionSelectTitle).toBeInTheDocument();
  });
  it('displays "default" value in only two select components when subExpression only has property set', () => {
    render({
      props: {
        subExpression: baseInternalSubExpression,
      },
    });

    const dataSourceSelectElement = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    const comparableDataSourceSelectElement = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_comparable_data_source'),
    });
    expect(dataSourceSelectElement).toBeInTheDocument();
    expect(comparableDataSourceSelectElement).toBeInTheDocument();
    expect(dataSourceSelectElement).toHaveValue(
      textMock('right_menu.expressions_data_source_select'),
    );
    expect(comparableDataSourceSelectElement).toHaveValue(
      textMock('right_menu.expressions_data_source_select'),
    );
  });
  it('calls onUpdateSubExpression when subExpression had existing value and dataSource is changed to DataSource.DataModel', async () => {
    const onUpdateSubExpression = jest.fn();
    render({
      props: {
        onUpdateSubExpression: onUpdateSubExpression,
        subExpression: {
          ...baseInternalSubExpression,
          dataSource: DataSource.Component,
          value: componentId,
        },
      },
    });

    // Find select components
    const selectDataSourceComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    expect(selectDataSourceComponent).toHaveValue(
      textMock('right_menu.expressions_data_source_component'),
    );
    const referenceSelector = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source_value'),
    });
    expect(referenceSelector).toHaveValue(subExpression0.value as string);
    // Click component/dataSource dropdown
    await act(() => user.click(selectDataSourceComponent));
    await act(() =>
      user.click(
        screen.getByRole('option', {
          name: textMock('right_menu.expressions_data_source_data_model'),
        }),
      ),
    );
    expect(onUpdateSubExpression).toHaveBeenCalledTimes(1);
    expect(onUpdateSubExpression).toHaveBeenCalledWith({
      ...baseInternalSubExpression,
      dataSource: DataSource.DataModel,
      value: undefined,
    });
  });
  it('calls onUpdateSubExpression when subExpression had existing value and dataSourceValue is changed to a new string', async () => {
    const onUpdateSubExpression = jest.fn();
    render({
      props: {
        onUpdateSubExpression: onUpdateSubExpression,
        subExpression: {
          ...baseInternalSubExpression,
          comparableDataSource: DataSource.String,
          comparableValue: stringValue,
        },
      },
    });

    // Find select components
    const selectDataSourceComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_comparable_data_source'),
    });
    expect(selectDataSourceComponent).toHaveValue(
      textMock('right_menu.expressions_data_source_string'),
    );
    const comparableValueInputField = screen.getByRole('textbox', {
      name: textMock('right_menu.expressions_data_source_comparable_value'),
    });
    expect(comparableValueInputField).toHaveValue(subExpression0.comparableValue as string);
    // Type new value to string comparable data source value
    await act(() => user.clear(comparableValueInputField));

    expect(onUpdateSubExpression).toHaveBeenCalledTimes(1);
    expect(onUpdateSubExpression).toHaveBeenCalledWith({
      ...baseInternalSubExpression,
      comparableDataSource: DataSource.String,
      comparableValue: '',
    });
  });
  it('displays dataSource, value, comparableDataSource and comparableValue when all are set on subExpression', async () => {
    render({});

    const selectDataSourceComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    const selectValueComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_data_source_value'),
    });
    const selectComparableDataSourceComponent = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_comparable_data_source'),
    });
    const selectComparableValueComponent = screen.getByRole('textbox');
    expect(selectDataSourceComponent).toHaveValue(
      textMock('right_menu.expressions_data_source_component'),
    );
    expect(selectValueComponent).toHaveValue(subExpression0.value as string);
    expect(selectComparableDataSourceComponent).toHaveValue(
      textMock('right_menu.expressions_data_source_string'),
    );
    expect(selectComparableValueComponent).toHaveValue(subExpression0.comparableValue as string);
  });
  it('removes subExpression from expression object and renders nothing when remove-sub-expression is clicked', async () => {
    const onRemoveSubExpression = jest.fn();
    render({
      props: {
        onRemoveSubExpression: onRemoveSubExpression,
      },
    });
    const deleteSubExpressionButton = screen.getByTitle(
      textMock('right_menu.expression_sub_expression_delete'),
    );
    await act(() => user.click(deleteSubExpressionButton));
    expect(onRemoveSubExpression).toHaveBeenCalledTimes(1);
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<SubExpressionContentProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: SubExpressionContentProps = {
    subExpression: subExpression0,
    onUpdateSubExpression: jest.fn(),
    onRemoveSubExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<SubExpressionContent {...defaultProps} {...props} />);
};
