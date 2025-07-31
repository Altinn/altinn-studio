import React from 'react';
import { screen } from '@testing-library/react';
import { internalExpressionWithMultipleSubExpressions } from '../../../../../../testing/expressionMocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../../testing/mocks';
import type { SimpleExpressionProps } from './SimpleExpression';
import { SimpleExpression } from './SimpleExpression';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IFormLayouts } from '../../../../../../types/global';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('SimpleExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays two data source selector components from subExpressionContent when there are two subExpressions in the expression', () => {
    render({});
    const subExpressionDataSourceSelectors = screen.queryAllByLabelText(
      textMock('right_menu.expressions_data_source'),
    );
    expect(subExpressionDataSourceSelectors).toHaveLength(2);
  });
  it('displays one addSubExpressionButton and one toggleButtonGroup with OR operator pressed', () => {
    render({});
    const operatorToggleGroupOr = screen.getByRole('radio', {
      name: textMock('right_menu.expressions_operator_or'),
    });
    const operatorToggleGroupAnd = screen.getByRole('radio', {
      name: textMock('right_menu.expressions_operator_and'),
    });
    expect(operatorToggleGroupOr).toBeInTheDocument();
    expect(operatorToggleGroupOr).toHaveAttribute('aria-checked', 'true');
    expect(operatorToggleGroupAnd).toBeInTheDocument();
    expect(operatorToggleGroupAnd).toHaveAttribute('aria-checked', 'false');
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
