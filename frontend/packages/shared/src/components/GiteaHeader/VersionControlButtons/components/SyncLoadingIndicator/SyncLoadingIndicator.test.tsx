import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyncLoadingIndicator, type SyncLoadingIndicatorProps } from './SyncLoadingIndicator';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockHeading: string = 'Heading';

const defaultProps: SyncLoadingIndicatorProps = {
  heading: mockHeading,
};

describe('SyncLoadingIndicator', () => {
  it('should render the provided heading', () => {
    render(<SyncLoadingIndicator {...defaultProps} />);

    expect(screen.getByRole('heading', { name: mockHeading, level: 3 })).toBeInTheDocument();
  });

  it('should render the StudioSpinner with the correct spinner title', () => {
    render(<SyncLoadingIndicator {...defaultProps} />);

    expect(screen.getByText(textMock('sync_modal.loading'))).toBeInTheDocument();
  });
});
