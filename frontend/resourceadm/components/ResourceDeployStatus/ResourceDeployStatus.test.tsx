import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceDeployStatusProps } from './ResourceDeployStatus';
import { ResourceDeployStatus } from './ResourceDeployStatus';
import userEvent from '@testing-library/user-event';
import type { DeployError } from '../../types/DeployError';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

// add own version of mock for <Trans> element, to test replacement of <LinkButton>
jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey, children }: { i18nKey: string; children: ReactElement }) => {
    const hasInterpolationElement = i18nKey.indexOf('<0>') > -1;
    if (hasInterpolationElement) {
      const parts = i18nKey.split(/<\/?0>/);
      return React.createElement(
        React.Fragment,
        {},
        ...parts.map((_part, index) => {
          const partString = textMock(i18nKey);
          return index % 2 === 1 ? React.cloneElement(children, {}, partString) : partString;
        }),
      );
    } else {
      return textMock(i18nKey);
    }
  },
  useTranslation: () => ({
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
  }),
}));

const testSidenName = 'Test siden';
const side2Name = 'Side 2';
const mockDeployError1: DeployError = {
  message: `{{num}} feil på siden <0>${testSidenName}</0>.`,
  pageWithError: 'about',
  numberOfErrors: 2,
};
const mockDeployError2: DeployError = {
  message: `{{num}} feil på siden <0>${side2Name}</0>.`,
  pageWithError: 'policy',
  numberOfErrors: 1,
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
    render(<ResourceDeployStatus {...defaultProps} error={[{ message: mockDeployErrorString }]} />);
    const errorMessage = screen.getByText(textMock(mockDeployErrorString));
    expect(errorMessage).toBeInTheDocument();
  });

  it('renders error messages with links when error is an array', () => {
    render(<ResourceDeployStatus {...defaultProps} />);

    const firstErrorMessageLink = screen.getByText(textMock(mockDeployError1.message));
    expect(firstErrorMessageLink).toBeInTheDocument();

    const secondErrorMessageLink = screen.getByText(textMock(mockDeployError2.message));

    expect(secondErrorMessageLink).toBeInTheDocument();
  });

  it('calls onNavigateToPageWithError function when link is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceDeployStatus {...defaultProps} />);

    const linkButton = screen.getByText(textMock(mockDeployError1.message));

    await user.click(linkButton);

    expect(mockOnNavigateToPageWithError).toHaveBeenCalledWith(mockDeployError1.pageWithError);
  });
});
