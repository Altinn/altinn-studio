import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { VersionControlButtons } from './VersionControlButtons';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { VersionControlButtonsContextProvider } from './context';
import {
  mockRepoStatus,
  mockVersionControlButtonsContextValue,
} from './test/mocks/versionControlContextMock';
import { renderWithProviders } from '../mocks/renderWithProviders';

const mockOnPullSuccess = vi.fn();

describe('VersionControlButtons', () => {
  afterEach(vi.clearAllMocks);

  it('should render FetchChangesPopover and ShareChangesPopover components', () => {
    renderVersionControlButtons();

    expect(
      screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.changes_to_share') }),
    ).toBeInTheDocument();
  });

  it('should disable ShareChangesPopover button if user has no push rights', () => {
    renderVersionControlButtons({
      getRepoMetadata: vi.fn().mockReturnValue({ data: { hasPushRights: false } }),
    });

    const shareChangesButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(shareChangesButton).toBeDisabled();
  });

  it('should disable FetchChangesPopover button if there are merge conflicts', () => {
    renderVersionControlButtons({
      getRepoStatus: vi.fn().mockReturnValue({ ...mockRepoStatus, hasMergeConflict: true }),
    });

    const fetchChangesButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(fetchChangesButton).toBeDisabled();
  });
});

const renderVersionControlButtons = (queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders({ ...queriesMock, ...queries })(
    <VersionControlButtonsContextProvider {...mockVersionControlButtonsContextValue}>
      <VersionControlButtons onPullSuccess={mockOnPullSuccess} />
    </VersionControlButtonsContextProvider>,
  );
};
