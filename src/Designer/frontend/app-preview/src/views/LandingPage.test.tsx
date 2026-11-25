import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { userEvent } from '@testing-library/user-event';
import { useMediaQuery } from '@designer/hooks/src/hooks/useMediaQuery';
import { renderWithProviders } from '../../test/mocks';
import { app, layoutSet, org } from '@designer/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { userMock } from 'app-development/test/userMock';
import { layoutSet3SubformNameMock } from '@altinn/ux-editor-v4/testing/layoutSetsMock';
import { useParams } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

vi.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: null, isLoading: false, error: null }),
}));
vi.mock('@designer/hooks/src/hooks/useMediaQuery');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: vi.fn(() => ({
    org,
    app,
    layoutSet,
  })),
}));
describe('LandingPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should inform that preview is turned off for an app before v9, and start no session', async () => {
    const startPreviewSession = vi.fn();
    renderLandingPage({
      getAppVersion: vi
        .fn()
        .mockResolvedValue({ frontendVersion: '4.0.0', backendVersion: '8.0.0' }),
      startPreviewSession,
    });

    await waitForElementToBeRemoved(screen.queryByLabelText(textMock('preview.loading_page')));

    expect(screen.getByText(textMock('preview.temporarily_disabled'))).toBeInTheDocument();
    expect(screen.queryByTitle(textMock('preview.title'))).not.toBeInTheDocument();
    expect(startPreviewSession).not.toHaveBeenCalled();
  });

  it('should display a spinner initially when loading user', () => {
    renderLandingPage();

    expect(screen.getByLabelText(textMock('preview.loading_page'))).toBeInTheDocument();
  });

  it('should render the app title if on a large screen', async () => {
    (useMediaQuery as Mock).mockReturnValue(false);
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByLabelText(textMock('preview.loading_page')));

    expect(screen.getByText('testApp')).toBeInTheDocument();
  });

  it('should not render the app title if on a small screen', async () => {
    (useMediaQuery as Mock).mockReturnValue(true);
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByLabelText(textMock('preview.loading_page')));

    expect(screen.queryByText('testApp')).not.toBeInTheDocument();
  });

  it('should display the user profile menu', async () => {
    const user = userEvent.setup();
    (useMediaQuery as Mock).mockReturnValue(false);
    renderLandingPage({
      getUser: vi.fn().mockImplementation(() => Promise.resolve(userMock)),
    });

    await waitForElementToBeRemoved(screen.queryByLabelText(textMock('preview.loading_page')));

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      }),
    );

    expect(
      screen.getByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
  });

  it('should show the app from the preview service, in an instance at the task', async () => {
    const createPreviewSessionInstance = vi.fn().mockResolvedValue({ instanceId: mockInstanceId });
    renderLandingPage({ createPreviewSessionInstance });

    const iframe = await screen.findByTitle(textMock('preview.title'));
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringMatching(`^${mockSessionUrl}instance/${mockInstanceId}/`),
    );
    expect(createPreviewSessionInstance).toHaveBeenCalledWith(
      org,
      app,
      mockSessionUrl,
      expect.any(String),
    );
  });

  it('should show an error when the preview service cannot start a session', async () => {
    renderLandingPage({ startPreviewSession: vi.fn().mockRejectedValue(new Error()) });

    expect(await screen.findByText(textMock('general.page_error_title'))).toBeInTheDocument();
    expect(screen.queryByTitle(textMock('preview.title'))).not.toBeInTheDocument();
  });

  it('should display a warning message when previewing a subform', async () => {
    renderLandingPage(
      {
        getLayoutSets: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve([{ id: layoutSet3SubformNameMock, type: 'subform' }]),
          ),
      },
      layoutSet3SubformNameMock,
    );

    await waitForElementToBeRemoved(screen.queryByLabelText(textMock('preview.loading_page')));

    expect(
      screen.getByText(textMock('ux_editor.preview.subform_unsupported_warning')),
    ).toBeInTheDocument();
  });
});

const mockSessionUrl = 'https://preview.test/0123456789abcdef0123456789abcdef/ttd/app/';
const mockInstanceId = '51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c';

const renderLandingPage = async (
  queries: Partial<ServicesContextProps> = {},
  previewLayoutSet = layoutSet,
) => {
  vi.mocked(useParams).mockReturnValue({
    org,
    app,
    layoutSet: previewLayoutSet,
  });
  const defaultQueries: Partial<ServicesContextProps> = {
    getAppVersion: vi.fn().mockResolvedValue({ frontendVersion: '9.0.0', backendVersion: '9.0.0' }),
    startPreviewSession: vi.fn().mockResolvedValue({ url: mockSessionUrl }),
    createPreviewSessionInstance: vi.fn().mockResolvedValue({ instanceId: mockInstanceId }),
  };
  // A client of its own, since the session and the instance are queries that would otherwise carry over.
  return renderWithProviders(
    { ...defaultQueries, ...queries },
    createQueryClientMock(),
  )(<LandingPage />);
};
