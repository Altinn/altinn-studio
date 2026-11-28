import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';

import { PreviewActions, type PreviewActionsProps } from './PreviewActions';

describe('PreviewActions', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should render with provided props', () => {
    renderPreviewActions({
      toggleTitle: textMock('ux_editor.open_preview'),
    });
    const toggleButton = screen.getByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should call onCollapseToggle when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const onCollapseToggleMock = vi.fn();
    renderPreviewActions({
      toggleTitle: textMock('ux_editor.open_preview'),
      onCollapseToggle: onCollapseToggleMock,
    });
    const toggleButton = screen.getByRole('button', {
      name: textMock('ux_editor.open_preview'),
    });
    await user.click(toggleButton);
    expect(onCollapseToggleMock).toHaveBeenCalled();
  });

  it('should have a link to open preview in new tab', () => {
    renderPreviewActions({
      toggleTitle: textMock('ux_editor.open_preview'),
    });
    const previewLinkButton = screen.getByRole('link', {
      name: textMock('ux_editor.open_preview_in_new_tab'),
    });
    expect(previewLinkButton).toBeInTheDocument();
    expect(previewLinkButton).toHaveAttribute('target', '_blank');
  });

  it('has no menu when preview cannot start over', () => {
    renderPreviewActions({});
    expect(
      screen.queryByRole('button', { name: textMock('ux_editor.preview.options') }),
    ).not.toBeInTheDocument();
  });

  it('starts preview over from its menu', async () => {
    const user = userEvent.setup();
    const onStartOver = vi.fn();
    renderPreviewActions({ onStartOver });
    await user.click(screen.getByRole('button', { name: textMock('ux_editor.preview.options') }));
    await user.click(
      screen.getByRole('menuitem', { name: textMock('ux_editor.preview.start_over') }),
    );
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });

  it('opens the form data from its menu', async () => {
    const user = userEvent.setup();
    const onEditFormData = vi.fn();
    renderPreviewActions({ onStartOver: vi.fn(), onEditFormData });
    await user.click(screen.getByRole('button', { name: textMock('ux_editor.preview.options') }));
    await user.click(
      screen.getByRole('menuitem', { name: textMock('ux_editor.preview.edit_form_data') }),
    );
    expect(onEditFormData).toHaveBeenCalledTimes(1);
  });

  it('lets the developer choose whom the user in preview acts for', async () => {
    const user = userEvent.setup();
    renderPreviewActions({ onStartOver: vi.fn() });
    await user.click(screen.getByRole('button', { name: textMock('ux_editor.preview.options') }));
    expect(
      screen.getByRole('menuitemradio', { name: textMock('preview.test_as_person') }),
    ).toHaveAttribute('aria-checked', 'true');

    await user.click(
      screen.getByRole('menuitemradio', { name: textMock('preview.test_as_organization') }),
    );

    await user.click(screen.getByRole('button', { name: textMock('ux_editor.preview.options') }));
    expect(
      screen.getByRole('menuitemradio', { name: textMock('preview.test_as_organization') }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: textMock('preview.test_as_person') }),
    ).toHaveAttribute('aria-checked', 'false');
  });
});

const renderPreviewActions = (props: Partial<PreviewActionsProps>) => {
  const defaultProps: PreviewActionsProps = {
    className: 'preview-actions',
    onCollapseToggle: vi.fn(),
  };
  return renderWithProviders(<PreviewActions {...defaultProps} {...props} />);
};
