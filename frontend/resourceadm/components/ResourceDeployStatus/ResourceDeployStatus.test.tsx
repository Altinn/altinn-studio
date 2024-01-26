import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceDeployStatusProps } from './ResourceDeployStatus';
import { ResourceDeployStatus } from './ResourceDeployStatus';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import type { DeployError } from '../../types/DeployError';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockDeployError1: DeployError = {
  message: "2 feil på siden 'Test siden'.",
  pageWithError: 'about',
};
const mockDeployError2: DeployError = {
  message: "1 feil på sdein 'Side 2'.",
  pageWithError: 'policy',
};

const mockDeployErrorList: DeployError[] = [mockDeployError1, mockDeployError2];

const mockDeployErrorString: string = 'Deploy error';

describe('ResourceDeployStatus', () => {
  const mockOnNavigateToPageWithError = jest.fn();

  const defaultProps: ResourceDeployStatusProps = {
    title: 'Title',
    error: mockDeployErrorList,
    isSuccess: false,
    onNavigateToPageWithError: mockOnNavigateToPageWithError,
    resourceId: 'resource-1',
  };

  it('renders error message when error is a string', () => {
    render(<ResourceDeployStatus {...defaultProps} error={mockDeployErrorString} />);
    const errorMessage = screen.getByText(mockDeployErrorString);
    expect(errorMessage).toBeInTheDocument();
  });

  it('renders error messages with links when error is an array', () => {
    render(<ResourceDeployStatus {...defaultProps} />);
    const firstErrorMessage = screen.getByText(mockDeployError1.message);

    const firstErrorMessageLink = screen.getByRole('button', {
      name: textMock('resourceadm.about_resource_title'),
    });
    expect(firstErrorMessage).toBeInTheDocument();
    expect(firstErrorMessageLink).toBeInTheDocument();

    const secondErrorMessage = screen.getByText(mockDeployError2.message);
    const secondErrorMessageLink = screen.getByRole('button', {
      name: textMock('resourceadm.policy_editor_title'),
    });

    expect(secondErrorMessage).toBeInTheDocument();
    expect(secondErrorMessageLink).toBeInTheDocument();
  });

  it('calls onNavigateToPageWithError function when link is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceDeployStatus {...defaultProps} />);

    const linkButton = screen.getByRole('button', {
      name: textMock('resourceadm.about_resource_title'),
    });

    await act(() => user.click(linkButton));

    expect(mockOnNavigateToPageWithError).toHaveBeenCalledWith(mockDeployError1.pageWithError);
  });
});
