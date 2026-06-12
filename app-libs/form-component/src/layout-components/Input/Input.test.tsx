import { type ReactNode, useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { InputLayout } from './Input';
import type { InputLayoutProps } from './Input';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  langAsString?: (key: string | undefined) => string;
}

const renderInput = (props: Partial<InputLayoutProps>, { lang, langAsString }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      langAsString={langAsString ?? ((key) => key ?? '')}
    >
      <InputLayout id='input' {...props} />
    </LanguageTranslatorProvider>,
  );

describe('InputLayout', () => {
  it('renders a textbox whose accessible name is the resolved title', () => {
    renderInput(
      { title: 'my.title' },
      { langAsString: (key) => (key === 'my.title' ? 'First name' : (key ?? '')) },
    );
    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
  });

  it('renders the resolved label text', () => {
    renderInput(
      { title: 'my.title' },
      { lang: (key) => (key === 'my.title' ? 'First name' : null) },
    );
    expect(screen.getByText('First name')).toBeInTheDocument();
  });

  it('does not render a visible label when renderLabel is false', () => {
    renderInput(
      { title: 'my.title', renderLabel: false },
      { lang: (key) => (key === 'my.title' ? 'First name' : null) },
    );
    expect(screen.queryByText('First name')).not.toBeInTheDocument();
  });

  it('forwards the new value from the text variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ title: 'x', onChange });
    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('forwards the new value from the number variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ title: 'x', numberFormat: { thousandSeparator: true }, onChange });
    await user.type(screen.getByRole('textbox'), '5');
    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('keeps the typed value on screen while it only differs from the committed value by trailing decimal zeros', async () => {
    const user = userEvent.setup();

    // A controlled harness whose onChange mimics the data layer normalising the value (e.g. the
    // committed value for '5.0' comes back as '5'). The component should still show what was typed.
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <LanguageTranslatorProvider lang={(key) => key ?? null} langAsString={(key) => key ?? ''}>
          <InputLayout
            id='input'
            title='x'
            numberFormat={{ decimalSeparator: '.' }}
            value={value}
            onChange={(next) => setValue(next.replace(/[.,]0+$/, ''))}
          />
        </LanguageTranslatorProvider>
      );
    }

    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, '5.0');
    // Without the transient value the field would snap to the normalised '5'.
    expect(input).toHaveValue('5.0');
  });

  it('normalises a pasted comma decimal separator to a dot for the number variant', () => {
    const onChange = vi.fn();
    renderInput({ title: 'x', numberFormat: { decimalSeparator: ',' }, onChange });
    fireEvent.paste(screen.getByRole('textbox'), { clipboardData: { getData: () => '1,5' } });
    expect(onChange).toHaveBeenCalledWith('1.5');
  });

  it('does not forward a paste when read-only', () => {
    const onChange = vi.fn();
    renderInput({ title: 'x', numberFormat: { decimalSeparator: ',' }, readOnly: true, onChange });
    fireEvent.paste(screen.getByRole('textbox'), { clipboardData: { getData: () => '1,5' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a search input for the search variant', () => {
    renderInput({ title: 'x', variant: 'search' });
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('formats the value as a number when a numeric numberFormat is supplied', () => {
    renderInput({
      title: 'x',
      value: '123456',
      numberFormat: { thousandSeparator: true, prefix: '$' },
    });
    expect(screen.getByRole('textbox')).toHaveValue('$123,456');
  });

  it('applies a pattern format when numberFormat has a format string', () => {
    renderInput({ title: 'x', value: '44444444', numberFormat: { format: '+47 ### ## ###' } });
    expect(screen.getByRole('textbox')).toHaveValue('+47 444 44 444');
  });

  it('accepts a configured allowed decimal separator while typing for the number variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({
      title: 'x',
      numberFormat: { allowedDecimalSeparators: [',', '.'], decimalSeparator: ',' },
      onChange,
    });
    const input = screen.getByRole('textbox');
    // Typing a '.' must be accepted as the decimal separator (and shown as ',') even though the
    // configured decimalSeparator is ','. Without allowedDecimalSeparators the '.' is dropped.
    await user.type(input, '11.1');
    expect(input).toHaveValue('11,1');
    expect(onChange).toHaveBeenLastCalledWith('11.1');
  });

  it('forwards the autocomplete attribute to the input', () => {
    renderInput({ title: 'x', autocomplete: 'name' });
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'name');
  });

  it('renders the resolved prefix and suffix', () => {
    renderInput(
      { title: 'x', prefix: 'pre.key', suffix: 'suf.key' },
      {
        langAsString: (key) =>
          ({ 'pre.key': 'NOK', 'suf.key': 'per month' })[key ?? ''] ?? key ?? '',
      },
    );
    expect(screen.getByText('NOK')).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
  });

  it('marks the field as invalid when error is true', () => {
    renderInput({ title: 'x', error: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders a read-only input', () => {
    renderInput({ title: 'x', value: 'Locked', readOnly: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('wires aria-describedby to the description when both title and description are present', () => {
    renderInput(
      { title: 'my.title', description: 'my.desc' },
      { lang: (key) => (key === 'my.desc' ? 'A description' : key) },
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'description-label-input');
    expect(document.getElementById('description-label-input')).toHaveTextContent('A description');
  });

  it('does not set aria-describedby when there is no title', () => {
    renderInput({ description: 'my.desc' });
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('renders a help button when a help key is supplied', () => {
    renderInput({ title: 'x', help: 'my.help' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render a help button without a help key', () => {
    renderInput({ title: 'x' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a character counter when maxLength is set', () => {
    renderInput(
      { title: 'x', maxLength: 10 },
      {
        langAsString: (key) =>
          key === 'input_components.remaining_characters' ? '%d characters left' : (key ?? ''),
      },
    );
    expect(screen.getByText(/characters left/i)).toBeInTheDocument();
  });

  it('renders an optional marking when not required and showOptionalMarking is set', () => {
    renderInput(
      { title: 'my.title', showOptionalMarking: true },
      {
        lang: (key) => (key === 'my.title' ? 'First name' : null),
        langAsString: (key) => (key === 'general.optional' ? 'optional' : (key ?? '')),
      },
    );
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });
});
