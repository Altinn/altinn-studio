import React from 'react';
import { Preview } from './Preview';
import { screen } from '@testing-library/react';
import type { ExtendedRenderOptions } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../testing/appContextMock';
import { previewPage } from 'app-shared/api/paths';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/api/mutations', () => ({
  createPreviewInstance: jest.fn().mockReturnValue(Promise.resolve({ id: 1 })),
}));

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

    await user.click(switchButton);
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
    const view = render();

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

  it('reloads preview when the selected form layout name changes', async () => {
    render();
    expect(appContextMock.previewIframeRef?.current?.src).toBe(
      'http://localhost' +
        previewPage(
          org,
          app,
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          appContextMock.selectedFormLayoutName,
        ),
    );

    const newSelectedFormLayoutName = 'test';
    appContextMock.selectedFormLayoutName = newSelectedFormLayoutName;

    render();
    expect(appContextMock.previewIframeRef.current.src).toBe(
      'http://localhost' +
        previewPage(
          org,
          app,
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          newSelectedFormLayoutName,
        ),
    );
  });
});

const collapseToggle = jest.fn();

export const render = (options: Partial<ExtendedRenderOptions> = {}) => {
  return renderWithProviders(
    <Preview collapsed={false} onCollapseToggle={collapseToggle} />,
    options,
  );
};
