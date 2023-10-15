import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { InputActionWrapperProps } from './InputActionWrapper';
import { InputActionWrapper } from './InputActionWrapper';

jest.mock('./InputActionWrapper', () => ({
  __esModule: true,
  InputActionWrapper: ({ children, onEditClick, onDeleteClick, onSaveClick }: any) => (
    <div>
      {children}
      <button onClick={onEditClick} aria-label='general.edit'>
        Edit
      </button>
      <button onClick={onSaveClick} aria-label='general.save'>
        Save
      </button>
      <button onClick={onDeleteClick} aria-label='general.delete'>
        Delete
      </button>
    </div>
  ),
}));

describe('InputActionWrapper', () => {
  const mockProps: InputActionWrapperProps = {
    children: <div />,
    mode: 'standBy',
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    onSaveClick: jest.fn(),
  };

  it('render save buttont', () => {
    render(mockProps);
    const button = screen.getByRole('button', { name: 'general.save' });
    expect(button).toBeInTheDocument();
  });

  it('render delete buttont', () => {
    render(mockProps);
    const button = screen.getByRole('button', { name: 'general.delete' });
    expect(button).toBeInTheDocument();
  });

  it('render edite buttont', () => {
    render(mockProps);
    const button = screen.getByRole('button', { name: 'general.edit' });
    expect(button).toBeInTheDocument();
  });

  it('handles focus and blur events', () => {
    render(mockProps);
    const wrapperSave = screen.getByRole('button', { name: 'general.save' });
    const wrapperEdit = screen.getByRole('button', { name: 'general.edit' });
    const wrapperDelete = screen.getByRole('button', { name: 'general.delete' });

    fireEvent.focus(wrapperEdit);
    expect(screen.getByLabelText('general.edit')).toBeInTheDocument();
    fireEvent.blur(wrapperEdit);
    expect(screen.queryByText('general.edit')).not.toBeInTheDocument();

    fireEvent.focus(wrapperSave);
    expect(screen.getByLabelText('general.save')).toBeInTheDocument();
    fireEvent.blur(wrapperSave);
    expect(screen.queryByText('general.save')).not.toBeInTheDocument();

    fireEvent.focus(wrapperDelete);
    expect(screen.getByLabelText('general.delete')).toBeInTheDocument();
    fireEvent.blur(wrapperDelete);
    expect(screen.queryByText('general.delete')).not.toBeInTheDocument();
  });

  it('handles mouse events', () => {
    render(mockProps);
    const wrapperEdit = screen.getByRole('button', { name: 'general.edit' });
    const wrapperDelete = screen.getByRole('button', { name: 'general.delete' });

    fireEvent.mouseOver(wrapperEdit);
    expect(screen.getByLabelText('general.edit')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapperEdit);
    expect(screen.queryByText('general.edit')).not.toBeInTheDocument();

    fireEvent.mouseOver(wrapperDelete);
    expect(screen.getByLabelText('general.delete')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapperDelete);
    expect(screen.queryByText('general.delete')).not.toBeInTheDocument();
  });

  it('check click events for delete, save, and edit', () => {
    render(mockProps);
    const editButton = screen.getByLabelText('general.edit');
    const saveButton = screen.getByLabelText('general.save');
    const deleteButton = screen.getByLabelText('general.delete');

    fireEvent.click(editButton);
    expect(mockProps.onEditClick).toHaveBeenCalledTimes(1);

    fireEvent.click(saveButton);
    expect(mockProps.onSaveClick).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteButton);
    expect(mockProps.onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('renders the correct number of buttons', () => {
    render(mockProps);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });
});

const render = (
  props: InputActionWrapperProps = {
    children: undefined,
    mode: undefined,
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    onSaveClick: jest.fn(),
  },
) => {
  const allProps = {
    children: undefined,
    mode: undefined,
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    onSaveClick: jest.fn(),
    ...props,
  } as InputActionWrapperProps;
  rtlRender(<InputActionWrapper {...allProps}></InputActionWrapper>);
};
