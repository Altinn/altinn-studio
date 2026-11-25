import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { renderWithProviders } from '../../../test/mocks';
import { Preview } from './Preview';
import { app, org } from '@designer/testing/testids';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { previewSessionPage } from 'app-shared/api/paths';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const layoutSetName = 'Task_1';
const layoutName = 'first-page';
const sessionUrl = 'https://preview.test/0123456789abcdef0123456789abcdef/ttd/app/';
const instanceId = '51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c';

const defaultLayoutSets: LayoutSets = [{ id: layoutSetName }];

const defaultLayoutSettings: ILayoutSettings = {
  pages: { order: [layoutName] },
};

describe('Preview', () => {
  it('should inform that preview is turned off for an app before v9, and start no session', async () => {
    const startPreviewSession = vi.fn();
    renderPreview({
      getAppVersion: vi
        .fn()
        .mockResolvedValue({ frontendVersion: '4.0.0', backendVersion: '8.0.0' }),
      startPreviewSession,
    });

    expect(await screen.findByText(textMock('preview.temporarily_disabled'))).toBeInTheDocument();
    expect(screen.queryByTitle('App Preview')).not.toBeInTheDocument();
    expect(startPreviewSession).not.toHaveBeenCalled();
  });

  it('should show a loading spinner while data is pending', () => {
    renderPreview();

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('should show an error message when layout metadata fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const errorMessage = 'Failed to load';

    renderPreview({
      getLayoutSets: vi.fn().mockRejectedValue(new Error(errorMessage)),
    });

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should show an error message when the preview service cannot start a session', async () => {
    renderPreview({
      getLayoutSets: vi.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: vi.fn().mockResolvedValue(defaultLayoutSettings),
      startPreviewSession: vi.fn().mockRejectedValue(new Error()),
    });

    expect(await screen.findByText('Error loading preview')).toBeInTheDocument();
    expect(screen.queryByTitle('App Preview')).not.toBeInTheDocument();
  });

  it("should show the first page of the app's first task from the preview service", async () => {
    const createPreviewSessionInstance = vi.fn().mockResolvedValue({ instanceId });
    renderPreview({
      getLayoutSets: vi.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: vi.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewSessionInstance,
    });

    expect(await screen.findByTitle('App Preview')).toHaveAttribute(
      'src',
      previewSessionPage(sessionUrl, instanceId, layoutSetName, layoutName),
    );
    expect(createPreviewSessionInstance).toHaveBeenCalledWith(org, app, sessionUrl, layoutSetName);
  });
});

const renderPreview = (queries: Partial<ServicesContextProps> = {}) => {
  const defaultQueries: Partial<ServicesContextProps> = {
    getAppVersion: vi.fn().mockResolvedValue({ frontendVersion: '9.0.0', backendVersion: '9.0.0' }),
    startPreviewSession: vi.fn().mockResolvedValue({ url: sessionUrl }),
    createPreviewSessionInstance: vi.fn().mockResolvedValue({ instanceId }),
  };
  // A client of its own, since the session and the instance are queries that would otherwise carry over.
  renderWithProviders({ ...defaultQueries, ...queries }, createQueryClientMock())(<Preview />);
};
