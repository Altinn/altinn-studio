import React from 'react';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';
import { texts } from '../../../../test-data/texts';
import { SubexpressionErrors } from './SubexpressionErrors';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { render, screen } from '@testing-library/react';
import { dataLookupOptions } from '../../../../test-data/dataLookupOptions';

describe('SubexpressionErrors', () => {
  it('Displays a list of the given errors', () => {
    const errorKeys = [
      ExpressionErrorKey.InvalidFirstOperand,
      ExpressionErrorKey.InvalidSecondOperand,
    ];
    render(
      <StudioExpressionContext.Provider value={{ texts, dataLookupOptions }}>
        <SubexpressionErrors errorKeys={errorKeys} />
      </StudioExpressionContext.Provider>,
    );
    const listItems = screen.getAllByRole('listitem');
    errorKeys.forEach((errorKey, index) => {
      expect(listItems[index]).toHaveTextContent(texts.errorMessages[errorKey]);
    });
  });
});
