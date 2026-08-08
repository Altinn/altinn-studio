import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import type { TabDataErrorProps } from './TabDataError';
import { TabDataError } from './TabDataError';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockChildrenText: string = 'Test error';
const mockChildren: ReactNode = <p>{mockChildrenText}</p>;

const defaultProps: TabDataErrorProps = {
  children: mockChildren,
};

describe('LoadingTabData', () => {
  afterEach(jest.clearAllMocks);

  it('displays the 2 default error messages, and the message from children', () => {
    render(<TabDataError {...defaultProps} />);

    const defaultMessage1 = screen.getByText(textMock('general.fetch_error_message'));
    expect(defaultMessage1).toBeInTheDocument();

    const defaultMessage2 = screen.getByText(textMock('general.error_message_with_colon'));
    expect(defaultMessage2).toBeInTheDocument();

    const childrenText = screen.getByText(mockChildrenText);
    expect(childrenText).toBeInTheDocument();
  });
});
