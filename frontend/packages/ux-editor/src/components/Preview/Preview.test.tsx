import React from 'react';
import { Preview } from './Preview';
import { act, screen } from '@testing-library/react';
import type { ExtendedRenderOptions } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../testing/appContextMock';
import { previewPage } from 'app-shared/api/paths';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', () => {
    render();
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(
      appContextMock.previewIframeRef.current,
    );
  });

  it('should be able to toggle between mobile and desktop view', async () => {
    const user = userEvent.setup();
    render();

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).not.toBeChecked();

    await act(() => user.click(switchButton));
    expect(switchButton).toBeChecked();
  });

  it('should render a message when no page is selected', () => {
    render({
      appContextProps: {
        selectedFormLayoutName: undefined,
      },
    });
    expect(screen.getByText(textMock('ux_editor.no_components_selected'))).toBeInTheDocument();
  });

  it('Renders the information alert with preview being limited', () => {
    render();

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
    render();

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

  it('reloads preview when the selected form layout name changes', async () => {
    const view = render();
    expect(appContextMock.previewIframeRef?.current?.src).toBe(
      'http://localhost' +
        previewPage(
          'org',
          'app',
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          appContextMock.selectedFormLayoutName,
        ),
    );

    const newSelectedFormLayoutName = 'test';
    appContextMock.selectedFormLayoutName = newSelectedFormLayoutName;

    view.rerender(<Preview />);

    expect(appContextMock.previewIframeRef?.current?.src).toBe(
      'http://localhost' +
        previewPage(
          'org',
          'app',
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          newSelectedFormLayoutName,
        ),
    );
  });
});

export const render = (options: Partial<ExtendedRenderOptions> = {}) =>
  renderWithProviders(<Preview />, options);
