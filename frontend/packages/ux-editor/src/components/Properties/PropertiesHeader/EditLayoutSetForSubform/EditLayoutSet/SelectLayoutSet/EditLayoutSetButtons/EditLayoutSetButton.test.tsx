import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditLayoutSetButtons, type EditLayoutSetButtonsProps } from './EditLayoutSetButtons';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultEditLayoutSetButtonsProps: EditLayoutSetButtonsProps = {
  onClose: jest.fn(),
  onDelete: jest.fn(),
};

describe('EditLayoutSetButtons', () => {
  it('should trigger onClose callback when close button is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = jest.fn();

    renderEditLayoutSetButtons({
      ...defaultEditLayoutSetButtonsProps,
      onClose: onCloseMock,
    });

    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should trigger onDelete callback when close button is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteMock = jest.fn();

    renderEditLayoutSetButtons({
      ...defaultEditLayoutSetButtonsProps,
      onDelete: onDeleteMock,
    });

    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);

    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });
});

const renderEditLayoutSetButtons = (props?: EditLayoutSetButtonsProps) => {
  return render(<EditLayoutSetButtons {...(props || defaultEditLayoutSetButtonsProps)} />);
};
