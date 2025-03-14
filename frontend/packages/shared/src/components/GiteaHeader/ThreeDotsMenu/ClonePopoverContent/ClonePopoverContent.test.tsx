import React from 'react';
import { ClonePopoverContent } from './ClonePopoverContent';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../mocks/renderWithProviders';

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

const renderClonePopoverContent = () => {
  const queries: Partial<ServicesContextProps> = {
    getDataModelsXsd: async () => [],
  };
  return renderWithProviders({ ...queriesMock, ...queries })(<ClonePopoverContent />);
};
