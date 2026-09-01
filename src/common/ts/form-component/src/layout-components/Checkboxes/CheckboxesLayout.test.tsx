import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';

import { Checkboxes } from './CheckboxesLayout';

const land = [
  { value: 'norge', label: 'land.norge' },
  { value: 'sverige', label: 'land.sverige' },
  { value: 'danmark', label: 'land.danmark' },
];

const overrides = {
  'land.norge': 'Norge',
  'land.sverige': 'Sverige',
  'land.danmark': 'Danmark',
  'checkboxes.title': 'Bostedsland',
  'checkboxes.description': 'Velg landene du har bodd i',
  'checkboxes.help': 'Du kan velge flere land',
  'land.norge.description': 'Kongeriket Norge',
  'land.norge.helpText': 'Norge inkluderer Svalbard',
};

const render = (
  props?: Partial<ComponentProps<typeof Checkboxes>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(
    <Checkboxes
      componentId='my-checkboxes'
      options={land}
      value={[]}
      onChange={() => {}}
      {...props}
    />,
    { overrides, ...options },
  );

const getCheckbox = (name: string, checked = false) =>
  screen.getByRole('checkbox', { name, checked });

describe('Checkboxes', () => {
  it('renders one checkbox per option', () => {
    render();
    expect(getCheckbox('Norge')).toBeInTheDocument();
    expect(getCheckbox('Sverige')).toBeInTheDocument();
    expect(getCheckbox('Danmark')).toBeInTheDocument();
  });

  it('checks the options present in value', () => {
    render({ value: ['norge', 'danmark'] });
    expect(getCheckbox('Norge', true)).toBeInTheDocument();
    expect(getCheckbox('Sverige')).toBeInTheDocument();
    expect(getCheckbox('Danmark', true)).toBeInTheDocument();
  });

  it('reports the toggled option and its new checked state', () => {
    const onChange = vi.fn();
    render({ value: ['norge'], onChange });

    fireEvent.click(getCheckbox('Danmark'));
    expect(onChange).toHaveBeenCalledWith('danmark', true);

    fireEvent.click(getCheckbox('Norge', true));
    expect(onChange).toHaveBeenLastCalledWith('norge', false);
  });

  it('renders the legend, its description and help text', async () => {
    render({
      title: 'checkboxes.title',
      description: 'checkboxes.description',
      help: 'checkboxes.help',
    });

    expect(screen.getByRole('group', { name: /Bostedsland/ })).toBeInTheDocument();
    expect(screen.getByText('Velg landene du har bodd i')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Bostedsland/ }));
    expect(await screen.findByText('Du kan velge flere land')).toBeInTheDocument();
  });

  it('renders no legend when renderLegend is false, but keeps the group labelled', () => {
    render({ title: 'checkboxes.title', renderLegend: false });
    expect(screen.queryByText('Bostedsland')).not.toBeInTheDocument();
  });

  it('renders the option description and help text', async () => {
    render({
      options: [
        {
          value: 'norge',
          label: 'land.norge',
          description: 'land.norge.description',
          helpText: 'land.norge.helpText',
        },
      ],
    });

    expect(screen.getByText('Kongeriket Norge')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Norge/ }));
    expect(await screen.findByText('Norge inkluderer Svalbard')).toBeInTheDocument();
  });

  it('renders read-only checkboxes when readOnly is set', () => {
    render({ readOnly: true });
    expect(getCheckbox('Norge')).toHaveAttribute('readonly');
  });

  it('renders the form-content wrapper for the given componentId', () => {
    const { container } = render();
    expect(container.querySelector('#form-content-my-checkboxes')).toBeInTheDocument();
  });

  it('renders the validation messages passed in by the app', () => {
    render({ validationMessages: 'Du må fylle ut bostedsland' });
    expect(screen.getByText('Du må fylle ut bostedsland')).toBeInTheDocument();
  });

  it('does not render a validation area when no validation messages are given', () => {
    render();
    expect(screen.queryByText('Du må fylle ut bostedsland')).not.toBeInTheDocument();
  });

  describe('layout', () => {
    it('lays out the options in a row when layout is "row" and there are three options', () => {
      render({ layout: 'row' });
      expect(screen.getByTestId('horizontalWrapper')).toBeInTheDocument();
    });

    it('lays out the options in a row when layout is undefined and there are two options', () => {
      render({ options: land.slice(0, 2) });
      expect(screen.getByTestId('horizontalWrapper')).toBeInTheDocument();
    });

    it('lays out the options in a column when layout is "column" and there are two options', () => {
      render({ options: land.slice(0, 2), layout: 'column' });
      expect(screen.queryByTestId('horizontalWrapper')).not.toBeInTheDocument();
    });

    it('lays out the options in a column when layout is undefined and there are three options', () => {
      render();
      expect(screen.queryByTestId('horizontalWrapper')).not.toBeInTheDocument();
    });
  });

  describe('rendered in a table', () => {
    it('labels the group with an aria-label instead of a legend', () => {
      render({ title: 'checkboxes.title', renderedInTable: true, renderLegend: false });
      expect(screen.getByRole('group', { name: 'Bostedsland' })).toBeInTheDocument();
    });

    it('hides the label of a single option', () => {
      render({ options: land.slice(0, 1), renderedInTable: true });
      expect(screen.getByText('Norge')).toHaveClass('sr-only');
    });

    it('keeps the label of a single option when showLabelsInTable is set', () => {
      render({ options: land.slice(0, 1), renderedInTable: true, showLabelsInTable: true });
      expect(screen.getByText('Norge')).not.toHaveClass('sr-only');
    });

    it('keeps the labels when there is more than one option', () => {
      render({ renderedInTable: true });
      expect(screen.getByText('Norge')).not.toHaveClass('sr-only');
    });
  });

  describe('alertOnChange', () => {
    // Each option gets its own confirmation popover, and its content sits in the DOM whether or not
    // the popover is open. These tests therefore render a single option and assert on whether the
    // change is applied, which is what the confirmation actually gates.
    const renderWithAlert = (props?: Partial<ComponentProps<typeof Checkboxes>>) =>
      render({ options: land.slice(0, 1), alertOnChange: true, ...props });

    it('renders the alert message and its buttons for the option', () => {
      renderWithAlert({ value: ['norge'] });
      expect(screen.getByText('Are you sure you want to uncheck?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('suspends unchecking until the change is confirmed', () => {
      const onChange = vi.fn();
      renderWithAlert({ value: ['norge'], onChange });

      fireEvent.click(getCheckbox('Norge', true));
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(onChange).toHaveBeenCalledWith('norge', false);
    });

    it('discards the change when the alert is cancelled', () => {
      const onChange = vi.fn();
      renderWithAlert({ value: ['norge'], onChange });

      fireEvent.click(getCheckbox('Norge', true));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onChange).not.toHaveBeenCalled();

      // The suspended change is dropped, so confirming afterwards does not apply it either.
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not ask for confirmation when checking an option', () => {
      const onChange = vi.fn();
      renderWithAlert({ onChange });

      fireEvent.click(getCheckbox('Norge'));
      expect(onChange).toHaveBeenCalledWith('norge', true);
    });
  });
});
