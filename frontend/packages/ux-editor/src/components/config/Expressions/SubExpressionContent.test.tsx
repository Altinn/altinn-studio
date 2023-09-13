import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubExpressionContent, SubExpressionContentProps } from './SubExpressionContent';
import { subExpression0 } from '../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { formDesignerMock, renderWithMockStore } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';
import { IFormLayouts } from '../../../types/global';

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
        subExpression: {
          ...subExpression0,
          dataSource: undefined,
          value: undefined,
          comparableDataSource: undefined,
          comparableValue: undefined,
          function: undefined,
        }
      }
    });

    const selectElement = screen.getByRole('combobox');
    const functionSelectTitle = screen.getByText(textMock('right_menu.expressions_function_on_property'));
    expect(selectElement).toBeInTheDocument();
    expect(functionSelectTitle).toBeInTheDocument();
  });
  it('displays "default" value in only two select components when subExpression only has property set', () => {
    render({
      props: {
        subExpression: {
          ...subExpression0,
          dataSource: undefined,
          value: undefined,
          comparableDataSource: undefined,
          comparableValue: undefined,
        }
      }
    });

    const dataSourceSelectElement = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source') });
    const comparableDataSourceSelectElement = screen.getByRole('combobox', { name: textMock('right_menu.expressions_comparable_data_source') });
    expect(dataSourceSelectElement).toBeInTheDocument();
    expect(comparableDataSourceSelectElement).toBeInTheDocument();
    expect(dataSourceSelectElement).toHaveValue(textMock('right_menu.expressions_data_source_select'));
    expect(comparableDataSourceSelectElement).toHaveValue(textMock('right_menu.expressions_data_source_select'));
  });
  it('calls onUpdateSubExpression when subExpression had existing value and dataSource is changed to DataSource.DataModel', async () => {
    const onUpdateSubExpression = jest.fn();
    render({
      props: {
        onUpdateSubExpression: onUpdateSubExpression,
        subExpression: {
          ...subExpression0,
          comparableDataSource: undefined,
          comparableValue: undefined,
        }
      }
    });

    // Find select components
    const selectDataSourceComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source') });
    expect(selectDataSourceComponent).toHaveValue(textMock('right_menu.expressions_data_source_component'));
    const referenceSelector = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source_value') });
    expect(referenceSelector).toHaveValue(subExpression0.value as string);
    // Click component/dataSource dropdown
    await act(() => user.click(selectDataSourceComponent));
    await act(() => user.click(screen.getByRole('option', { name: textMock('right_menu.expressions_data_source_data_model') })));
    expect(onUpdateSubExpression).toHaveBeenCalledTimes(1);
  });
  it('displays dataSource, value, comparableDataSource and comparableValue when all are set on subExpression', async () => {
    render({});

    const selectDataSourceComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source') });
    const selectValueComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_data_source_value') });
    const selectComparableDataSourceComponent = screen.getByRole('combobox', { name: textMock('right_menu.expressions_comparable_data_source') });
    const selectComparableValueComponent = screen.getByRole('textbox');
    expect(selectDataSourceComponent).toHaveValue(textMock('right_menu.expressions_data_source_component'));
    expect(selectValueComponent).toHaveValue(subExpression0.value as string);
    expect(selectComparableDataSourceComponent).toHaveValue(textMock('right_menu.expressions_data_source_string'));
    expect(selectComparableValueComponent).toHaveValue(subExpression0.comparableValue as string);
  });
  it('removes subExpression from expression object and renders nothing when remove-sub-expression is clicked', async () => {
    const onRemoveSubExpression = jest.fn();
    render({
      props: {
        onRemoveSubExpression: onRemoveSubExpression,
    }
  });
    const deleteSubExpressionButton = screen.getByTitle(textMock('general.delete'));
    await act(() => user.click(deleteSubExpressionButton));
    expect(onRemoveSubExpression).toHaveBeenCalledTimes(1);
  });
});

const render = ({ props = {}, queries = {}, }: {
  props?: Partial<SubExpressionContentProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: SubExpressionContentProps = {
    expressionPropertyIsSet: true,
    subExpression: subExpression0,
    onUpdateSubExpression: jest.fn(),
    onRemoveSubExpression: jest.fn()
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore({}, queries, queryClient)(<SubExpressionContent {...defaultProps} {...props} />);
};
