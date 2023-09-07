import React from 'react';
import { screen } from '@testing-library/react';
import { internalParsableComplexExpression } from '../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../testing/mocks';
import { ComplexExpression, ComplexExpressionProps } from "./ComplexExpression";
import { stringifyData } from "../../../utils/jsonUtils";

describe('ComplexExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('displays textArea with complex expression as value', () => {
    render({});
    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toHaveTextContent(stringifyData(internalParsableComplexExpression.complexExpression));
  });
});

const render = ({ props = {}, queries = {}, }: {
  props?: Partial<ComplexExpressionProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: ComplexExpressionProps = {
    expression: internalParsableComplexExpression,
    onChange: jest.fn(),
  };
  return renderWithMockStore({}, queries)(<ComplexExpression {...defaultProps} {...props} />);
};
