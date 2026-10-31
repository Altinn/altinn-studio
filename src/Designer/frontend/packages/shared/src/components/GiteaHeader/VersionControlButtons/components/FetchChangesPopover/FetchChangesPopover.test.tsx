import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { FetchChangesPopover } from './FetchChangesPopover';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  VersionControlButtonsContext,
  type VersionControlButtonsContextProps,
} from '../../context';
import { mockVersionControlButtonsContextValue } from '../../test/mocks/versionControlContextMock';
import { useMediaQuery } from '@studio/hooks';
import { renderWithProviders } from '../../../mocks/renderWithProviders';

vi.mock('@studio/hooks/src/hooks/useMediaQuery');

describe('FetchChangesPopover', () => {
  it('should fetch changes and confirm the update when the app is up to date', async () => {
    const user = userEvent.setup();
    const fetchChanges = vi.fn().mockResolvedValue(true);
    renderFetchChangesPopover({ versionControlButtonsContextProps: { fetchChanges } });

    await user.click(screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }));

    expect(fetchChanges).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(textMock('sync_header.service_updated_to_latest')),
    ).toBeInTheDocument();
  });

  it('should close the popover without confirming an update when fetching does not update the app', async () => {
    const user = userEvent.setup();
    const fetchChanges = vi.fn().mockResolvedValue(false);
    renderFetchChangesPopover({ versionControlButtonsContextProps: { fetchChanges } });

    await user.click(screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }));

    await waitFor(() => expect(fetchChanges).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByText(textMock('sync_header.fetching_latest_version')),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText(textMock('sync_header.service_updated_to_latest')),
    ).not.toBeInTheDocument();
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          behindBy: numberOfChanges,
        },
      },
    });

    expect(screen.getByRole('status')).toHaveAttribute('data-count', String(numberOfChanges));
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          behindBy: numberOfChanges,
        },
        hasMergeConflict: true,
      },
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should render fetch changes button as disabled when there are merge conflicts', () => {
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        hasMergeConflict: true,
      },
    });

    const fetchButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(fetchButton).toHaveAttribute('disabled');
  });

  it('should render the button with text on a large screen', () => {
    renderFetchChangesPopover();

    expect(screen.getByText(textMock('sync_header.fetch_changes'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }),
    ).toBeInTheDocument();
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as Mock).mockReturnValue(true);
    renderFetchChangesPopover();

    expect(screen.queryByText(textMock('sync_header.fetch_changes'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }),
    ).toBeInTheDocument();
  });
});

type Props = {
  versionControlButtonsContextProps?: Partial<VersionControlButtonsContextProps>;
};

const renderFetchChangesPopover = (props: Partial<Props> = {}) => {
  const { versionControlButtonsContextProps } = props;

  return renderWithProviders()(
    <VersionControlButtonsContext.Provider
      value={{ ...mockVersionControlButtonsContextValue, ...versionControlButtonsContextProps }}
    >
      <FetchChangesPopover />
    </VersionControlButtonsContext.Provider>,
  );
};
