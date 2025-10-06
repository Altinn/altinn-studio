import React from 'react';
import { Preview } from './Preview';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { ExtendedRenderOptions } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../testing/appContextMock';
import { previewPage } from 'app-shared/api/paths';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { subformLayoutMock } from '../../testing/subformLayoutMock';

describe('Preview', () => {
  it('Renders an iframe with the ref from AppContext', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(screen.getByTitle(textMock('ux_editor.preview'))).toBe(
      appContextMock.previewIframeRef.current,
    );
  });

  it('should be able to toggle between mobile and desktop view', async () => {
    const user = userEvent.setup();
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).not.toBeChecked();

    await user.click(switchButton);
    expect(switchButton).toBeChecked();
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

  it('shows a spinner when preview instance is loading', () => {
    render();
    expect(screen.getByText(textMock('preview.loading_preview_controller'))).toBeInTheDocument();
  });

  it('reloads preview when the selected form layout name changes', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(appContextMock.previewIframeRef?.current?.src).toBe(
      'http://localhost' +
        previewPage(
          org,
          app,
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          appContextMock.selectedFormLayoutName,
          mockInstanceId,
        ),
    );

    const newSelectedFormLayoutName = 'test';
    appContextMock.selectedFormLayoutName = newSelectedFormLayoutName;

    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );
    expect(appContextMock.previewIframeRef.current.src).toBe(
      'http://localhost' +
        previewPage(
          org,
          app,
          appContextMock.selectedFormLayoutSetName,
          TASKID_FOR_STATELESS_APPS,
          newSelectedFormLayoutName,
          mockInstanceId,
        ),
    );
  });

  it('should show a warning that subform is unsupported in preview', async () => {
    appContextMock.selectedFormLayoutSetName = subformLayoutMock.layoutSetName;
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('preview.loading_preview_controller')),
    );

    expect(screen.getByText(/ux_editor.preview.subform_unsupported_warning/i)).toBeInTheDocument();
  });
});

const collapseToggle = jest.fn();
const mockInstanceId = '1';

export const render = (options: Partial<ExtendedRenderOptions> = {}) => {
  options = {
    ...options,
    queries: {
      getLayoutSets: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ sets: [{ id: subformLayoutMock.layoutSetName, type: 'subform' }] }),
        ),
      createPreviewInstance: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ id: mockInstanceId })),
    },
  };
  return renderWithProviders(
    <Preview collapsed={false} onCollapseToggle={collapseToggle} />,
    options,
  );
};
