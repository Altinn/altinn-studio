import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('renders with the provided value', () => {
    render(<TextArea id='ta' value='initial text' onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('initial text');
  });

  it('calls onChange with the new value when the user types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TextArea id='ta' value='' onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onBlur when the textarea loses focus', async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup();

    render(<TextArea id='ta' value='' onChange={vi.fn()} onBlur={onBlur} />);

    await user.click(screen.getByRole('textbox'));
    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('does not let the user change a read-only textarea', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TextArea id='ta' value='locked' onChange={onChange} readOnly />);

    await user.type(screen.getByRole('textbox'), 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards accessibility and test attributes', () => {
    render(
      <TextArea
        id='ta'
        value=''
        onChange={vi.fn()}
        ariaLabel='Comment'
        ariaDescribedBy='desc-id'
        dataTestId='ta-test'
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment' });
    expect(textarea).toHaveAttribute('aria-describedby', 'desc-id');
    expect(textarea).toHaveAttribute('data-testid', 'ta-test');
  });

  it('renders a character counter when characterLimit is provided', () => {
    render(
      <TextArea
        id='ta'
        value='abc'
        onChange={vi.fn()}
        characterLimit={{ limit: 10, under: '%d characters left' }}
      />,
    );

    expect(screen.getByText('7 characters left')).toBeInTheDocument();
  });
});
