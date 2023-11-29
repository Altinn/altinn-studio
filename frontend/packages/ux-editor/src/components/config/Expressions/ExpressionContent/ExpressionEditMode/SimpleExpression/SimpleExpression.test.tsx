import React from 'react';
import { screen } from '@testing-library/react';
import { internalExpressionWithMultipleSubExpressions } from '../../../../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../../testing/mocks';
import { formDesignerMock } from '../../../../../../testing/stateMocks';
import { SimpleExpression, SimpleExpressionProps } from './SimpleExpression';
import { textMock } from '../../../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { IFormLayouts } from '../../../../../../types/global';
import { layout1NameMock, layoutMock } from '../../../../../../testing/layoutMock';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('SimpleExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays two data source selector components from subExpressionContent when there are two subExpressions in the expression', () => {
    render({});
    const subExpressionDataSourceSelectors = screen.queryAllByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    expect(subExpressionDataSourceSelectors).toHaveLength(2);
  });
  it('displays one addSubExpressionButton and one toggleButtonGroup with OR operator pressed', () => {
    render({});
    const operatorToggleGroupOr = screen.getByRole('button', {
      name: textMock('right_menu.expressions_operator_or'),
    });
    const operatorToggleGroupAnd = screen.getByRole('button', {
      name: textMock('right_menu.expressions_operator_and'),
    });
    expect(operatorToggleGroupOr).toBeInTheDocument();
    expect(operatorToggleGroupOr).toHaveAttribute('aria-pressed', 'true');
    expect(operatorToggleGroupAnd).toBeInTheDocument();
    expect(operatorToggleGroupAnd).toHaveAttribute('aria-pressed', 'false');
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<SimpleExpressionProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: SimpleExpressionProps = {
    expression: internalExpressionWithMultipleSubExpressions,
    onRemoveSubExpression: jest.fn(),
    onUpdateExpressionOperator: jest.fn(),
    onUpdateSubExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<SimpleExpression {...defaultProps} {...props} />);
};
