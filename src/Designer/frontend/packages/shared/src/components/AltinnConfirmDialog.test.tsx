import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AltinnConfirmDialogProps } from './AltinnConfirmDialog';
import { AltinnConfirmDialog } from './AltinnConfirmDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

const descriptionTextMock = textMock('general.description');
const confirmTextMock = textMock('general.confirm');
const cancelTextMock = textMock('general.cancel');
const onConfirmMock = jest.fn();
const onCloseMock = jest.fn();

describe('AltinnConfirmDialog', () => {
  afterEach(jest.clearAllMocks);

  it('should not show the dialog when closed', async () => {
    await render({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show the dialog when open', async () => {
    await render({ open: true });

    const text = await screen.findByText(descriptionTextMock);
    expect(text).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: confirmTextMock });
    expect(confirmButton).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: cancelTextMock });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call onConfirm and onClose when clicking the confirm button', async () => {
    await render();

    const confirmButton = screen.getByRole('button', { name: confirmTextMock });
    await user.click(confirmButton);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking the cancel button', async () => {
    await render();

    const cancelButton = screen.getByRole('button', { name: cancelTextMock });
    await user.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the dialog', async () => {
    await render();

    await user.click(document.body);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});

const render = async (props: Partial<AltinnConfirmDialogProps> = {}) => {
  const allProps: AltinnConfirmDialogProps = {
    confirmText: confirmTextMock,
    onConfirm: onConfirmMock,
    cancelText: cancelTextMock,
    onClose: onCloseMock,
    open: true,
    ...props,
  };

  return rtlRender(
    <AltinnConfirmDialog {...allProps}>
      <p>{descriptionTextMock}</p>
    </AltinnConfirmDialog>,
  );
};
