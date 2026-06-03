import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { InputLayout } from './Input';
import type { InputLayoutProps } from './Input';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  translate?: (key: string) => string;
}

const renderInput = (props: Partial<InputLayoutProps>, { lang, translate }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      translate={translate ?? ((key) => key)}
      TranslateComponent={({ tKey }) => <span>{tKey}</span>}
    >
      <InputLayout id='input' {...props} />
    </LanguageTranslatorProvider>,
  );

describe('InputLayout', () => {
  it('renders a textbox whose accessible name is the resolved title', () => {
    renderInput(
      { title: 'my.title' },
      { translate: (key) => (key === 'my.title' ? 'First name' : key) },
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

  it('forwards change events from the text variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ title: 'x', onChange });
    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalled();
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

  it('renders the resolved prefix and suffix', () => {
    renderInput(
      { title: 'x', prefix: 'pre.key', suffix: 'suf.key' },
      { translate: (key) => ({ 'pre.key': 'NOK', 'suf.key': 'per month' })[key] ?? key },
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
        translate: (key) =>
          key === 'input_components.remaining_characters' ? '%d characters left' : key,
      },
    );
    expect(screen.getByText(/characters left/i)).toBeInTheDocument();
  });

  it('renders an optional marking when not required and showOptionalMarking is set', () => {
    renderInput(
      { title: 'my.title', showOptionalMarking: true },
      {
        lang: (key) => (key === 'my.title' ? 'First name' : null),
        translate: (key) => (key === 'general.optional' ? 'optional' : key),
      },
    );
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });
});
