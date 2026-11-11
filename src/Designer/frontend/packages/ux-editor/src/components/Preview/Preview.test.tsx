import { afterEach, describe, expect, it, vi } from 'vitest';
import { Preview } from './Preview';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { ExtendedRenderOptions } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../testing/appContextMock';
import { previewSessionPage } from 'app-shared/api/paths';
import { app, layoutSet, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const previewAvailability = vi.hoisted(() => ({ isPreviewDisabled: false }));
vi.mock('app-shared/utils/previewAvailability', () => ({
  get isPreviewDisabled() {
    return previewAvailability.isPreviewDisabled;
  },
}));

describe('Preview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    previewAvailability.isPreviewDisabled = false;
  });

  it('Informs that preview is temporarily disabled instead of loading it', () => {
    previewAvailability.isPreviewDisabled = true;
    const startPreviewSession = vi.fn();
    render({ queries: { startPreviewSession } });
    expect(screen.getByText(textMock('preview.temporarily_disabled'))).toBeInTheDocument();
    expect(screen.queryByTitle(textMock('ux_editor.preview'))).not.toBeInTheDocument();
    expect(startPreviewSession).not.toHaveBeenCalled();
  });

  it('Renders an iframe with the ref from AppContext', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(
      appContextMock.previewIframeRef.current,
    );
  });

  it('should render a message when no page is selected', async () => {
    render({
      appContextProps: {
        selectedFormLayoutName: undefined,
      },
    });
    expect(screen.getByText(textMock('ux_editor.no_components_selected'))).toBeInTheDocument();
  });

  it('Renders the information alert with preview being limited', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
    expect(previewLimitationsAlert).toBeInTheDocument();
  });

  it('should not display open preview button if preview is open', () => {
    render();

    const showPreviewButton = screen.queryByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });

    expect(showPreviewButton).not.toBeInTheDocument();
  });

  it('should be possible to toggle preview window', async () => {
    const user = userEvent.setup();
    const view = render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    const hidePreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.close_preview'),
    });
    await user.click(hidePreviewButton);
    expect(collapseToggle).toHaveBeenCalledTimes(1);
    view.rerender(<Preview collapsed={true} onCollapseToggle={collapseToggle} />);
    expect(hidePreviewButton).not.toBeInTheDocument();

    const showPreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });
    await user.click(showPreviewButton);
    expect(collapseToggle).toHaveBeenCalledTimes(2);
    view.rerender(<Preview collapsed={false} onCollapseToggle={collapseToggle} />);
    expect(showPreviewButton).not.toBeInTheDocument();
  });

  it('shows a spinner while the preview session starts', () => {
    render();
    expect(screen.getByText(textMock('preview.loading_preview_controller'))).toBeInTheDocument();
  });

  it('reloads preview when the selected form layout name changes', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(appContextMock.previewIframeRef?.current?.src).toBe(
      previewSessionPage(
        mockSessionUrl,
        mockInstanceId,
        layoutSet,
        appContextMock.selectedFormLayoutName,
      ),
    );

    const newSelectedFormLayoutName = 'test';
    appContextMock.selectedFormLayoutName = newSelectedFormLayoutName;

    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(appContextMock.previewIframeRef.current.src).toBe(
      previewSessionPage(mockSessionUrl, mockInstanceId, layoutSet, newSelectedFormLayoutName),
    );
  });

  it('should show a warning that subform is unsupported in preview', async () => {
    render({
      queries: {
        getLayoutSets: vi
          .fn()
          .mockImplementation(() => Promise.resolve([{ id: layoutSet, type: 'subform' }])),
      },
      queryClient: createQueryClientMock(),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(screen.getByText(/ux_editor.preview.subform_unsupported_warning/i)).toBeInTheDocument();
  });

  it('shows an error when the preview session does not start', async () => {
    render({
      queries: {
        startPreviewSession: vi.fn().mockImplementation(() => Promise.reject('Error')),
      },
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(screen.getByText(textMock('general.page_error_title'))).toBeInTheDocument();
  });

  it('should show error message when preview instance creation fails', async () => {
    render({
      queries: {
        createPreviewSessionInstance: vi.fn().mockImplementation(() => Promise.reject('Error')),
      },
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(screen.getByText(textMock('general.page_error_title'))).toBeInTheDocument();
  });

  it("points the iframe at the layout set's task in the preview session", async () => {
    const createPreviewSessionInstance = vi
      .fn()
      .mockImplementation(() => Promise.resolve({ instanceId: mockInstanceId }));
    render({ queries: { createPreviewSessionInstance } });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(createPreviewSessionInstance).toHaveBeenCalledWith(org, app, mockSessionUrl, layoutSet);
    expect(appContextMock.previewIframeRef.current.src).toBe(
      `${mockSessionUrl}instance/${mockInstanceId}/${layoutSet}/${appContextMock.selectedFormLayoutName}`,
    );
  });
});

const collapseToggle = vi.fn();
const mockSessionUrl = 'https://preview.test/0123456789abcdef0123456789abcdef/ttd/app/';
const mockInstanceId = '51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c';

export const render = (options: Partial<ExtendedRenderOptions> = {}) => {
  const defaultQueries = {
    startPreviewSession: vi.fn().mockImplementation(() => Promise.resolve({ url: mockSessionUrl })),
    createPreviewSessionInstance: vi
      .fn()
      .mockImplementation(() => Promise.resolve({ instanceId: mockInstanceId })),
  };

  // A client of its own, since the session and the instance are queries that would otherwise carry over.
  options = {
    queryClient: createQueryClientMock(),
    ...options,
    queries: {
      ...defaultQueries,
      ...options.queries,
    },
  };
  return renderWithProviders(
    <Preview collapsed={false} onCollapseToggle={collapseToggle} />,
    options,
  );
};
