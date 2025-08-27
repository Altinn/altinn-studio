import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { YesNoQuestion } from './YesNoQuestion';
import userEvent from '@testing-library/user-event';

describe('YesNoQuestion', () => {
  it('should render YesNoQuestion', () => {
    const onChange = jest.fn();
    render(
      <YesNoQuestion
        id='1'
        value=''
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Question')).toBeInTheDocument();
  });

  it('should render YesNoQuestion with both buttons un-selected', () => {
    const onChange = jest.fn();
    render(
      <YesNoQuestion
        id='1'
        value=''
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'yes' })).not.toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'no' })).not.toHaveAttribute('aria-selected', 'true');
  });
  it('should render YesNoQuestion with yes button selected', () => {
    const onChange = jest.fn();
    render(
      <YesNoQuestion
        id='1'
        value='yes'
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'yes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'no' })).not.toHaveAttribute('aria-selected', 'true');
  });

  it('should render YesNoQuestion with no button selected', () => {
    const onChange = jest.fn();
    render(
      <YesNoQuestion
        id='1'
        value='no'
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'no' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'yes' })).not.toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('should call onChange when yes button is selected', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <YesNoQuestion
        id='1'
        value=''
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    const yesButton = screen.getByRole('button', { name: 'yes' });
    expect(onChange).not.toHaveBeenCalled();

    await user.click(yesButton);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith('1', 'yes');
  });

  it('should call onChange when yes button is unselected', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <YesNoQuestion
        id='1'
        value='yes'
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    const yesButton = screen.getByRole('button', { name: 'yes' });
    expect(onChange).not.toHaveBeenCalled();

    await user.click(yesButton);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith('1', '');
  });

  it('should call onChange when no button is clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <YesNoQuestion
        id='1'
        value=''
        label='Question'
        buttonLabels={{ yes: 'yes', no: 'no' }}
        onChange={onChange}
      />,
    );

    const noButton = screen.getByRole('button', { name: 'no' });
    expect(onChange).not.toHaveBeenCalled();

    await user.click(noButton);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith('1', 'no');
  });
});
