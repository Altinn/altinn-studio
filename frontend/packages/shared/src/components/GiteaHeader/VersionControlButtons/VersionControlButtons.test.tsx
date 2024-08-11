import React from 'react';
import { screen } from '@testing-library/react';
import { VersionControlButtons } from './VersionControlButtons';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { VersionControlButtonsContextProvider } from './context';
import {
  mockRepoStatus,
  mockVersionControlButtonsContextValue,
} from './test/mocks/versionControlContextMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '@studio/testing/wrapper';

const mockOnPullSuccess = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

describe('VersionControlButtons', () => {
  afterEach(jest.clearAllMocks);

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
      queries: {
        getRepoMetadata: jest.fn().mockReturnValue({ data: { hasPushRights: false } }),
      },
    });

    const shareChangesButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(shareChangesButton).toBeDisabled();
  });

  it('should disable FetchChangesPopover button if there are merge conflicts', () => {
    renderVersionControlButtons({
      queries: {
        getRepoStatus: jest.fn().mockReturnValue({ ...mockRepoStatus, hasMergeConflict: true }),
      },
    });

    const fetchChangesButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(fetchChangesButton).toBeDisabled();
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
};

const renderVersionControlButtons = (props: Partial<Props> = {}) => {
  const { queries } = props;

  return renderWithProviders(
    <VersionControlButtonsContextProvider {...mockVersionControlButtonsContextValue}>
      <VersionControlButtons onPullSuccess={mockOnPullSuccess} />
    </VersionControlButtonsContextProvider>,
    {
      queries,
    },
  );
};
