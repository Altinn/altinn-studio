import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';

import { MultipleSelect } from './MultipleSelectLayout';

const spraak = [
  { value: 'norsk', label: 'spraak.norsk' },
  { value: 'svensk', label: 'spraak.svensk' },
  { value: 'dansk', label: 'spraak.dansk', description: 'spraak.dansk.beskrivelse' },
];

const overrides = {
  'spraak.norsk': 'Norsk',
  'spraak.svensk': 'Svensk',
  'spraak.dansk': 'Dansk',
  'spraak.dansk.beskrivelse': 'Snakkes i Danmark',
  'multipleselect.title': 'Språk du snakker',
  'multipleselect.description': 'Velg alle språkene du snakker',
};

const render = (
  props?: Partial<ComponentProps<typeof MultipleSelect>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(
    <MultipleSelect
      componentId='my-multiple-select'
      options={spraak}
      values={[]}
      onChange={() => {}}
      {...props}
    />,
    {
      overrides,
      ...options,
    },
  );

// The Designsystemet Suggestion renders a `<u-combobox>` web component whose input only gains the
// `combobox` role once the custom element upgrades — which does not happen in the stock jsdom used
// here. We therefore query the underlying `<input id={componentId}>` directly.
const getInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input#my-multiple-select');

const getPopover = (container: HTMLElement) => container.querySelector('.ds-popover');

// The `<u-combobox>` custom element does not upgrade in jsdom, so we emulate its contract: the
// Designsystemet Suggestion listens for `comboboxbeforeselect` whose `detail` is a `<data>`
// element — a connected one (an existing chip) means "remove", a detached one means "add".
const dispatchBeforeSelect = (detail: HTMLDataElement) => {
  const combobox = document.querySelector('u-combobox');
  if (!combobox) {
    throw new Error('Found no u-combobox element');
  }
  // The non-upgraded element lacks the u-combobox `multiple` getter (backed by data-multiple).
  Object.defineProperty(combobox, 'multiple', { value: true, configurable: true });
  fireEvent(
    combobox,
    new CustomEvent('comboboxbeforeselect', { detail, bubbles: true, cancelable: true }),
  );
};

const selectOption = (value: string, label: string) => {
  const data = document.createElement('data');
  data.value = value;
  data.textContent = label;
  dispatchBeforeSelect(data);
};

const removeSelected = (value: string) => {
  const chip = Array.from(document.querySelectorAll('data')).find((el) => el.value === value);
  if (!chip) {
    throw new Error(`Found no selected chip with value ${value}`);
  }
  dispatchBeforeSelect(chip);
};

describe('MultipleSelect', () => {
  it('renders the label and associates it with the input', () => {
    const { container } = render({ title: 'multipleselect.title' });
    expect(screen.getByLabelText('Språk du snakker')).toBe(getInput(container));
  });

  it('renders no visible label when no title is provided', () => {
    const { container } = render();
    expect(container.querySelector('label')).not.toBeInTheDocument();
    expect(getInput(container)).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    const { container } = render();
    expect(container.querySelector('#form-content-my-multiple-select')).toBeInTheDocument();
  });

  it('renders the validation messages passed in by the app', () => {
    render({ validationMessages: 'Du må velge minst ett språk' });
    expect(screen.getByText('Du må velge minst ett språk')).toBeInTheDocument();
  });

  it('does not render a validation area when no validation messages are given', () => {
    render();
    expect(screen.queryByText('Du må velge minst ett språk')).not.toBeInTheDocument();
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
    expect(screen.getByText('Norsk')).toBeInTheDocument();
    expect(screen.getByText('Svensk')).toBeInTheDocument();
    expect(screen.getByText('Dansk')).toBeInTheDocument();
  });

  it('renders the option description under the option label', () => {
    render();
    expect(screen.getByText('Snakkes i Danmark')).toBeInTheDocument();
  });

  it('adds a newly selected value to the selection', () => {
    const onChange = vi.fn();
    render({ values: ['norsk'], onChange });

    selectOption('svensk', 'Svensk');
    expect(onChange).toHaveBeenCalledWith(['norsk', 'svensk']);
  });

  it('removes an already-selected value when it is deselected', () => {
    const onChange = vi.fn();
    render({ values: ['norsk', 'svensk'], onChange });

    removeSelected('svensk');
    expect(onChange).toHaveBeenCalledWith(['norsk']);
  });

  it('does not alert when adding a value even if alertOnChange is set', () => {
    const onChange = vi.fn();
    render({ values: ['norsk'], alertOnChange: true, onChange });

    selectOption('svensk', 'Svensk');
    expect(onChange).toHaveBeenCalledWith(['norsk', 'svensk']);
  });

  it('gates the change behind a confirmation popover when alertOnChange removes a value', () => {
    const onChange = vi.fn();
    const { container } = render({ values: ['norsk', 'svensk'], alertOnChange: true, onChange });

    removeSelected('svensk');

    // The change is suspended: the alert message names the removed value and onChange has not fired yet.
    expect(getPopover(container)).toHaveTextContent('Are you sure you want to delete Svensk?');
    expect(onChange).not.toHaveBeenCalled();

    // Confirming applies the removal (confirm label resolves from the text resources — 'Confirm' in en).
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onChange).toHaveBeenCalledWith(['norsk']);
  });

  it('discards the removal when the alert is cancelled', () => {
    const onChange = vi.fn();
    const { container } = render({ values: ['norsk', 'svensk'], alertOnChange: true, onChange });

    removeSelected('svensk');

    // The cancel label resolves from the text resources ('general.cancel' → 'Cancel' in en).
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(getPopover(container)).not.toHaveTextContent('Are you sure you want to delete');

    // The suspended change is dropped, so confirming afterwards does not apply it either.
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes the title via aria-label when rendered in a table', () => {
    const { container } = render({ title: 'multipleselect.title', renderedInTable: true });
    expect(getInput(container)).toHaveAttribute('aria-label', 'Språk du snakker');
    expect(screen.getByRole('textbox', { name: 'Språk du snakker' })).toBeInTheDocument();
  });

  it('does not set an aria-label on the input when not rendered in a table', () => {
    const { container } = render({ title: 'multipleselect.title' });
    expect(getInput(container)).not.toHaveAttribute('aria-label');
  });
});
