import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TextQuestion } from './TextQuestion';
import { userEvent } from '@testing-library/user-event';

describe('TextQuestion', () => {
  it('should render TextQuestion', () => {
    const onChange = jest.fn();
    render(<TextQuestion id='1' value='' label='Question' onChange={onChange} />);

    expect(screen.getByRole('textbox', { name: 'Question' })).toBeInTheDocument();
  });

  it('should render TextQuestion with expected value', () => {
    const onChange = jest.fn();
    render(<TextQuestion id='1' value='This is a test' label='Question' onChange={onChange} />);

    expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('This is a test');
  });

  it('should call onChange when input is changed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<TextQuestion id='1' value='' label='Question' onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(onChange).not.toHaveBeenCalled();

    await user.type(input, 'Answer');

    // Need to wait because save is done with 500ms debounce
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith('1', 'Answer');
  });
});
