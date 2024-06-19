import React from 'react';
import { render, screen } from '@testing-library/react';
import { FetchingFromGitea, type FetchingFromGiteaProps } from './FetchingFromGitea';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockHeading: string = 'Heading';

const defaultProps: FetchingFromGiteaProps = {
  heading: mockHeading,
};

describe('FetchingFromGitea', () => {
  afterEach(jest.clearAllMocks);

  it('should render the provided heading', () => {
    render(<FetchingFromGitea {...defaultProps} />);

    expect(screen.getByRole('heading', { name: mockHeading, level: 3 })).toBeInTheDocument();
  });

  it('should render the StudioSpinner with the correct spinner title', () => {
    render(<FetchingFromGitea {...defaultProps} />);

    expect(screen.getByText(textMock('sync_modal.loading'))).toBeInTheDocument();
  });
});
