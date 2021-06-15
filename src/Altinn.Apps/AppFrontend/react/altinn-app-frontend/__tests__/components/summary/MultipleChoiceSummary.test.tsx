/* tslint:disable:jsx-wrap-multiline */
import '@testing-library/jest-dom/extend-expect';
import 'jest';
import * as React from 'react';
import { render } from '@testing-library/react';
import MultipleChoiceSummary, { IMultipleChoiceSummaryProps } from '../../../src/components/summary/MultipleChoiceSummary';

describe('components/summary/MultipleChoiceSummary.tsx', () => {
  let mockFormData: any;
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockFormData = {
      1: 'This is a text',
      2: 'This is another text',
    };
    mockHandleDataChange = jest.fn();
  });

  test('components/summary/MultipleChoiceSummary.tsx -- should match snapshot', () => {
    const { asFragment } = renderMultipleChoiceSummaryComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  function renderMultipleChoiceSummaryComponent(props: Partial<IMultipleChoiceSummaryProps> = {}) {
    const defaultProps: IMultipleChoiceSummaryProps = {
      formData: mockFormData,
      label: 'TestLabel',
      hasValidationMessages: false,
      changeText: 'Endre',
      onChangeClick: mockHandleDataChange,
      readOnlyComponent: false,
    };

    return render(<MultipleChoiceSummary {...defaultProps} {...props}/>);
  }
});
