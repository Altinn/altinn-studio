import React from 'react';
import { screen } from '@testing-library/react';
import {
  internalParsableComplexExpression,
  internalUnParsableComplexExpression,
} from '../../../../../testing/expressionMocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../testing/mocks';
import type { ComplexExpressionProps } from './ComplexExpression';
import { ComplexExpression } from './ComplexExpression';
import { stringifyData } from '../../../../../utils/jsonUtils';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

describe('ComplexExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('displays textArea with complex expression as value', () => {
    render({});
    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toHaveTextContent(
      stringifyData(internalUnParsableComplexExpression.complexExpression),
    );
  });
  it('displays an editable textArea', () => {
    render({});
    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).not.toHaveAttribute('disabled');
  });
  it('displays an non-editable textArea when expression is preview', () => {
    render({
      props: {
        disabled: true,
      },
    });
    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toHaveAttribute('disabled');
  });
  it('displays too complex expression info message if expression can not be interpreted by Studio', () => {
    render({});
    const tooComplexExpressionAlert = screen.getByText(
      textMock('right_menu.expressions_complex_expression_message'),
    );
    expect(tooComplexExpressionAlert).toBeInTheDocument();
  });
  it('does not display too complex expression info message if expression can be interpreted by Studio', () => {
    render({
      props: {
        expression: internalParsableComplexExpression.complexExpression,
        isStudioFriendly: true,
      },
    });
    const tooComplexExpressionAlert = screen.queryByText(
      textMock('right_menu.expressions_complex_expression_message'),
    );
    expect(tooComplexExpressionAlert).not.toBeInTheDocument();
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<ComplexExpressionProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: ComplexExpressionProps = {
    expression: internalUnParsableComplexExpression,
    onChange: jest.fn(),
    isStudioFriendly: false,
  };
  return renderWithMockStore({}, queries)(<ComplexExpression {...defaultProps} {...props} />);
};
