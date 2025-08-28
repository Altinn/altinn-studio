import React, { createRef } from 'react';
import { Preview } from './Preview';
import { screen } from '@testing-library/react';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithMockStore } from '../../testing/mocks';
import type { IAppState } from '../../types/global';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(previewIframeRef.current);
  });

  it('should be able to toggle between mobile and desktop view', async () => {
    const user = userEvent.setup();
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).not.toBeChecked();

    await user.click(switchButton);
    expect(switchButton).toBeChecked();
  });

  it('should render a message when no page is selected', () => {
    const mockedLayout = { layout: { selectedLayout: undefined } } as IAppState['formDesigner'];
    renderWithMockStore({ formDesigner: mockedLayout }, {}, queryClientMock)(<Preview />);
    expect(screen.getByText(textMock('ux_editor.no_components_selected'))).toBeInTheDocument();
  });

  it('Renders the information alert with preview being limited', () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);

    const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
    expect(previewLimitationsAlert).toBeInTheDocument();
  });

  it('should not display open preview button if preview is open', () => {
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);

    const showPreviewButton = screen.queryByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });

    expect(showPreviewButton).not.toBeInTheDocument();
  });

  it('should be possible to toggle preview window', async () => {
    const user = userEvent.setup();
    const previewIframeRef = createRef<HTMLIFrameElement>();
    renderWithMockStore({}, {}, queryClientMock, { previewIframeRef })(<Preview />);

    const hidePreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.close_preview'),
    });
    await user.click(hidePreviewButton);
    expect(hidePreviewButton).not.toBeInTheDocument();

    const showPreviewButton = screen.getByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });
    await user.click(showPreviewButton);
    expect(showPreviewButton).not.toBeInTheDocument();
  });
});
