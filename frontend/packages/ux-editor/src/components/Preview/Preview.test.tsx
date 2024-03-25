import React, { createRef } from 'react';
import { Preview } from './Preview';
import { act, screen, waitFor } from '@testing-library/react';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ExtendedRenderOptions } from '../../testing/mocks';
import { renderHookWithProviders, renderWithProviders } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', async () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    await render({
      queryClient: queryClientMock,
      appContextProps: { previewIframeRef },
    });
    await waitFor(() =>
      expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(previewIframeRef.current),
    );
  });

  it('should be able to toggle between mobile and desktop view', async () => {
    const user = userEvent.setup();
    const previewIframeRef = createRef<HTMLIFrameElement>();
    await render({
      queryClient: queryClientMock,
      appContextProps: { previewIframeRef },
    });

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).not.toBeChecked();

    await act(() => user.click(switchButton));
    expect(switchButton).toBeChecked();
  });

  it('should render a message when no page is selected', async () => {
    await render({
      queryClient: queryClientMock,
      appContextProps: {
        selectedFormLayoutName: undefined,
      },
    });
    expect(screen.getByText(textMock('ux_editor.no_components_selected'))).toBeInTheDocument();
  });

  it('Renders the information alert with preview being limited', async () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    await render({
      queryClient: queryClientMock,
      appContextProps: { previewIframeRef },
    });

    const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
    expect(previewLimitationsAlert).toBeInTheDocument();
  });

  it('should not display open preview button if preview is open', async () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    await render({
      queryClient: queryClientMock,
      appContextProps: { previewIframeRef },
    });

    const showPreviewButton = screen.queryByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });

    expect(showPreviewButton).not.toBeInTheDocument();
  });

  it('should be possible to toggle preview window', async () => {
    const user = userEvent.setup();
    const previewIframeRef = createRef<HTMLIFrameElement>();
    await render({
      queryClient: queryClientMock,
      appContextProps: { previewIframeRef },
    });

    const hidePreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.close_preview'),
    });
    await act(() => user.click(hidePreviewButton));
    expect(hidePreviewButton).not.toBeInTheDocument();

    const showPreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });
    await act(() => user.click(showPreviewButton));
    expect(showPreviewButton).not.toBeInTheDocument();
  });
});

export const render = async (options: Partial<ExtendedRenderOptions>) => {
  const formLayoutsSettingsResult = renderHookWithProviders(() =>
    useFormLayoutSettingsQuery('org', 'app', 'selectedLayoutSet'),
  ).result;
  await waitFor(() => expect(formLayoutsSettingsResult.current.isSuccess).toBe(true));

  return renderWithProviders(<Preview />, options);
};
