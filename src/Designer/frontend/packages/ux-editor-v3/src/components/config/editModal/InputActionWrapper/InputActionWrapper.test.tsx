import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InputActionWrapperProps } from './InputActionWrapper';
import { InputActionWrapper } from './InputActionWrapper';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const mockProps: InputActionWrapperProps = {
  mode: 'editMode',
  onEditClick: jest.fn(),
  onDeleteClick: jest.fn(),
  onSaveClick: jest.fn(),
  children: <input />,
};

describe('InputActionWrapper', () => {
  it('renders save and delete buttons when mode is (editMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='editMode' />);
    expect(screen.getByLabelText(textMock('general.save'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('general.delete'))).toBeInTheDocument();
  });

  it('renders edit button when mode is (hoverMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='hoverMode' />);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
  });

  it('does not render save button when mode is (hoverMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='hoverMode' />);
    expect(screen.queryByLabelText(textMock('general.save'))).not.toBeInTheDocument();
  });

  it('displays only the edit button when mode is (hoverMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='hoverMode' />);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
    expect(screen.queryByLabelText(textMock('general.delete'))).not.toBeInTheDocument();
  });

  it('does not renders edit button when mode is (editMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='editMode' />);
    expect(screen.queryByLabelText(textMock('general.edit'))).not.toBeInTheDocument();
  });

  it('renders delete button when mode is (editMode)', async () => {
    await render(<InputActionWrapper {...mockProps} mode='editMode' />);
    expect(screen.getByLabelText(textMock('general.delete'))).toBeInTheDocument();
  });

  it('triggers save click on save button click', async () => {
    render(<InputActionWrapper {...mockProps} />);
    const saveButton = screen.getByLabelText(textMock('general.save'));
    await user.click(saveButton);
    expect(mockProps.onSaveClick).toHaveBeenCalledTimes(1);
  });

  it('triggers delete click on delete button click', async () => {
    render(<InputActionWrapper {...mockProps} />);
    const deleteButton = screen.getByLabelText(textMock('general.delete'));
    await user.click(deleteButton);
    expect(mockProps.onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('check that handleActionClick is called when edit button is clicked', async () => {
    render(<InputActionWrapper {...mockProps} mode='hoverMode' />);
    const editButton = screen.getByLabelText(textMock('general.edit'));
    await user.click(editButton);
    expect(mockProps.onEditClick).toHaveBeenCalledTimes(1);
  });

  it('check that handleHover is called when onMouseOver is called ', async () => {
    render(<InputActionWrapper {...mockProps} mode='standBy' />);
    const input = screen.getByRole('textbox');
    await user.hover(input);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
  });

  it('check that handleBlur is called when onMouseLeave is called ', async () => {
    render(<InputActionWrapper {...mockProps} mode='standBy' />);
    const input = screen.getByRole('textbox');
    await user.hover(input);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
    await user.unhover(input);
    expect(screen.queryByLabelText(textMock('general.edit'))).not.toBeInTheDocument();
  });

  it('check that handleFocus is called when onFocus is called ', async () => {
    render(<InputActionWrapper {...mockProps} mode='standBy' />);
    const input = screen.getByRole('textbox');
    await user.hover(input);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
  });

  it('renders right actions when switching mode', async () => {
    const { rerender } = await render(<InputActionWrapper {...mockProps} mode={'editMode'} />);
    expect(screen.getByLabelText(textMock('general.save'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('general.delete'))).toBeInTheDocument();

    rerender(<InputActionWrapper {...mockProps} mode={'hoverMode'} />);
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
  });
});
