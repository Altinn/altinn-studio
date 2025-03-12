import React from 'react';
import { ClonePopoverContent, type ClonePopoverContentProps } from './ClonePopoverContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const mockOnClose = jest.fn();

const defaultProps: ClonePopoverContentProps = {
  onClose: mockOnClose,
};

describe('cloneModal', () => {
  afterEach(jest.clearAllMocks);

  it('should show copy link if copy feature is supported', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });
    renderClonePopoverContent();

    expect(
      screen.getByRole('button', {
        name: textMock('sync_header.clone_https_button'),
      }),
    ).toBeInTheDocument();
  });

  it('should NOT show copy link if copy feature is NOT supported', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });
    renderClonePopoverContent();

    expect(
      screen.queryByRole('button', {
        name: textMock('sync_header.clone_https_button'),
      }),
    ).not.toBeInTheDocument();
  });
});

const renderClonePopoverContent = (props: Partial<ClonePopoverContentProps> = {}) => {
  const queries: Partial<ServicesContextProps> = {
    getAppDataModelsXsd: async () => [],
  };
  return render(
    <ServicesContextProvider {...queries}>
      <ClonePopoverContent {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
