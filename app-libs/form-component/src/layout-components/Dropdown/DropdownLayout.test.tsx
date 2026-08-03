import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';

import { Dropdown } from './DropdownLayout';

const land = [
  { value: 'norge', label: 'land.norge' },
  { value: 'sverige', label: 'land.sverige' },
  { value: 'danmark', label: 'land.danmark' },
];

const overrides = {
  'land.norge': 'Norge',
  'land.sverige': 'Sverige',
  'land.danmark': 'Danmark',
  'dropdown.title': 'Bostedsland',
  'dropdown.description': 'Velg landet du bor i',
};

const render = (
  props?: Partial<ComponentProps<typeof Dropdown>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(
    <Dropdown componentId='my-dropdown' options={land} value='' {...props} />,
    {
      overrides,
      ...options,
    },
  );

// The Designsystemet Suggestion renders a `<u-combobox>` web component whose input only gains the
// `combobox` role once the custom element upgrades — which does not happen in the stock jsdom used
// here. We therefore query the underlying `<input id={componentId}>` directly.
const getInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input#my-dropdown');

describe('Dropdown', () => {
  it('renders the label and associates it with the input', () => {
    const { container } = render({ title: 'dropdown.title' });
    expect(screen.getByLabelText('Bostedsland')).toBe(getInput(container));
  });

  it('renders no visible label when no title is provided', () => {
    const { container } = render();
    expect(container.querySelector('label')).not.toBeInTheDocument();
    expect(getInput(container)).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    const { container } = render();
    expect(container.querySelector('#form-content-my-dropdown')).toBeInTheDocument();
  });

  it('renders the validation messages passed in by the app', () => {
    render({ validationMessages: 'Du må fylle ut bostedsland' });
    expect(screen.getByText('Du må fylle ut bostedsland')).toBeInTheDocument();
  });

  it('does not render a validation area when no validation messages are given', () => {
    render();
    expect(screen.queryByText('Du må fylle ut bostedsland')).not.toBeInTheDocument();
  });

  it('renders a read-only input when readOnly is set', () => {
    const { container } = render({ readOnly: true });
    expect(getInput(container)).toHaveAttribute('readonly');
  });

  it('marks the input as invalid when isValid is false', () => {
    const { container } = render({ isValid: false });
    expect(getInput(container)).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders each option label', () => {
    render();
    expect(screen.getByText('Norge')).toBeInTheDocument();
    expect(screen.getByText('Sverige')).toBeInTheDocument();
    expect(screen.getByText('Danmark')).toBeInTheDocument();
  });

  it('gates the change behind a confirmation popover when alertOnChange overwrites an existing value', () => {
    const onChange = vi.fn();
    // Clicking an option fires the option's onClick (React attaches it to the host element regardless
    // of the web-component upgrade), which drives the real alert-on-change wiring in DropdownLayout.
    render({ value: 'norge', alertOnChange: true, onChange });

    fireEvent.click(screen.getByText('Sverige'));

    // The change is suspended: the popover is shown and onChange has not fired yet.
    expect(screen.getByTestId('delete-warning-popover')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    // Confirming applies the change (confirm label resolves from general/text resources — 'Confirm' in en).
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onChange).toHaveBeenCalledWith('sverige');
  });

  it('exposes the title via aria-label when rendered in a table', () => {
    const { container } = render({ title: 'dropdown.title', renderedInTable: true });
    // The title is exposed to assistive tech via the input's aria-label...
    expect(getInput(container)).toHaveAttribute('aria-label', 'Bostedsland');
    expect(screen.getByRole('textbox', { name: 'Bostedsland' })).toBeInTheDocument();
  });

  it('does not set an aria-label on the input when not rendered in a table', () => {
    const { container } = render({ title: 'dropdown.title' });
    expect(getInput(container)).not.toHaveAttribute('aria-label');
  });
});
