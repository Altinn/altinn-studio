import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { DropdownLayout } from './Dropdown';
import type { DropdownLayoutProps, DropdownOption } from './Dropdown';

const OPTIONS: DropdownOption[] = [
  { value: 'norway', label: 'country.norway' },
  { value: 'sweden', label: 'country.sweden' },
  { value: 'denmark', label: 'country.denmark' },
];

const STRINGS: Record<string, string> = {
  'my.title': 'Country',
  'my.description': 'Where you live',
  'country.norway': 'Norway',
  'country.sweden': 'Sweden',
  'country.denmark': 'Denmark',
  'helptext.button_title': 'Help',
  'helptext.button_title_prefix': 'Help for',
  'form_filler.required_label': '*',
  'general.optional': 'optional',
  'general.loading': 'Loading',
};

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  translate?: (key: string) => string;
}

const renderDropdown = (
  props: Partial<DropdownLayoutProps> = {},
  { lang, translate }: Stubs = {},
) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => (key ? (STRINGS[key] ?? key) : null))}
      translate={translate ?? ((key) => STRINGS[key] ?? key)}
      TranslateComponent={({ tKey }) => <span>{STRINGS[tKey] ?? tKey}</span>}
    >
      <DropdownLayout id='d1' options={OPTIONS} {...props} />
    </LanguageTranslatorProvider>,
  );

describe('DropdownLayout', () => {
  it('resolves the title key via the context and renders it as the label', () => {
    renderDropdown({ title: 'my.title' });
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderDropdown({ title: 'my.title', help: 'my.help' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render a help button when no help key is supplied', () => {
    renderDropdown({ title: 'my.title' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the description with the derived description id', () => {
    renderDropdown({ title: 'my.title', description: 'my.description' });
    const desc = screen.getByText('Where you live');
    expect(desc).toHaveAttribute('id', 'description-label-d1');
  });

  it('renders a required indicator when required', () => {
    renderDropdown({ title: 'my.title', required: true });
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders an optional marking when not required and showOptionalMarking is set', () => {
    renderDropdown({ title: 'my.title', showOptionalMarking: true });
    expect(screen.getByText('(optional)', { exact: false })).toBeInTheDocument();
  });

  it('renders a spinner instead of the field while loading', () => {
    renderDropdown({ title: 'my.title', loading: true });
    expect(screen.getByTestId('altinn-spinner')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('marks the input as read-only when readOnly is set', () => {
    const { container } = renderDropdown({ title: 'my.title', readOnly: true });
    expect(container.querySelector('#d1')).toHaveAttribute('readonly');
  });

  it('marks the input as invalid when error is set', () => {
    const { container } = renderDropdown({ title: 'my.title', error: true });
    expect(container.querySelector('#d1')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders the resolved option labels', () => {
    renderDropdown({ title: 'my.title' });
    expect(screen.getByText('Norway')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.getByText('Denmark')).toBeInTheDocument();
  });

  it('commits the selected value via onChange when an option is clicked', async () => {
    const onChange = vi.fn();
    renderDropdown({ title: 'my.title', onChange });
    await userEvent.click(screen.getByText('Sweden'));
    expect(onChange).toHaveBeenCalledWith('sweden');
  });

  it('does not alert and commits immediately when changing from no selection', async () => {
    const onChange = vi.fn();
    renderDropdown({ title: 'my.title', alertOnChange: true, onChange });
    await userEvent.click(screen.getByText('Sweden'));
    expect(onChange).toHaveBeenCalledWith('sweden');
  });

  it('defers the change behind a confirmation when alertOnChange is set and a value already exists', async () => {
    const onChange = vi.fn();
    renderDropdown({ title: 'my.title', alertOnChange: true, value: 'norway', onChange });
    await userEvent.click(screen.getByText('Sweden'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
