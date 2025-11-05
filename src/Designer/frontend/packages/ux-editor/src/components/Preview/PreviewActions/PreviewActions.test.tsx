import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';

import { PreviewActions, type PreviewActionsProps } from './PreviewActions';

describe('PreviewActions', () => {
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
    const onCollapseToggleMock = jest.fn();
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
});

const renderPreviewActions = (props: Partial<PreviewActionsProps>) => {
  const defaultProps = {
    toggleIcon: <div>Toggle Icon</div>,
    className: 'preview-actions',
    onCollapseToggle: jest.fn(),
  };
  return renderWithProviders(<PreviewActions {...defaultProps} {...props} />);
};
