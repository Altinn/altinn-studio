import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Input } from './Input';

describe('Input', () => {
  it('renders a textbox with a visible label', () => {
    render(<Input label='First name' />);

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
  });

  it('uses aria-label as the accessible name', () => {
    render(<Input aria-label='Search' />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('uses aria-labelledby as the accessible name', () => {
    render(
      <>
        <span id='ssn-label'>Social security number</span>
        <Input aria-labelledby='ssn-label' />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Social security number' })).toBeInTheDocument();
  });

  it('forwards change events', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label='Name' onChange={onChange} />);

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
  });

  it('renders a read-only input', () => {
    render(<Input aria-label='Name' value='Locked' readOnly onChange={() => {}} />);

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('readonly');
  });

  it('marks the input as invalid when an error is passed', () => {
    render(<Input aria-label='Name' error='Required' />);

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders prefix and suffix as already-translated strings', () => {
    render(<Input aria-label='Amount' prefix='NOK' suffix='per month' />);

    expect(screen.getByText('NOK')).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
  });

  it('renders a placeholder', () => {
    render(<Input aria-label='Search' placeholder='Type to search' />);

    expect(screen.getByPlaceholderText('Type to search')).toBeInTheDocument();
  });

  it('shows a character counter when characterLimit is set', () => {
    render(
      <Input
        aria-label='Bio'
        value='Hi'
        onChange={() => {}}
        characterLimit={{ limit: 10, under: 'characters left', over: 'too many characters' }}
      />,
    );

    expect(screen.getByText(/characters left/i)).toBeInTheDocument();
  });

  it('hides the character counter for read-only inputs', () => {
    render(
      <Input
        aria-label='Bio'
        value='Hi'
        readOnly
        onChange={() => {}}
        characterLimit={{ limit: 10, under: 'characters left', over: 'too many characters' }}
      />,
    );

    expect(screen.queryByText(/characters left/i)).not.toBeInTheDocument();
  });

  describe('textonly', () => {
    it('renders the value as plain text instead of an input', () => {
      render(<Input aria-label='Name' textonly value='Ada Lovelace' onChange={() => {}} />);

      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('renders nothing when the value is empty', () => {
      const { container } = render(
        <Input aria-label='Name' textonly value='' onChange={() => {}} />,
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
