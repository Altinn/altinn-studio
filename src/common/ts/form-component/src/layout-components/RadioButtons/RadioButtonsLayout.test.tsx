import type { ComponentProps } from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { renderWithTranslations } from '../../test/renderWithTranslations';
import { RadioButtonsLayout } from './RadioButtonsLayout';

const land = [
  { value: 'norge', label: 'land.norge' },
  { value: 'sverige', label: 'land.sverige' },
  { value: 'danmark', label: 'land.danmark' },
];

const overrides = {
  'land.norge': 'Norge',
  'land.sverige': 'Sverige',
  'land.danmark': 'Danmark',
  'radio.title': 'Bostedsland',
  'radio.description': 'Velg landet du bor i',
  'radio.help': 'Landet der du er folkeregistrert',
  'likert.header': 'Spørsmål',
  'land.norge.description': 'Kongeriket Norge',
  'land.norge.helpText': 'Norge inkluderer Svalbard',
};

const render = (props?: Partial<ComponentProps<typeof RadioButtonsLayout>>) =>
  renderWithTranslations(
    <RadioButtonsLayout
      componentId='my-radio'
      options={land}
      value={undefined}
      onChange={() => {}}
      {...props}
    />,
    { overrides },
  );

const horizontalWrapper = (container: HTMLElement) =>
  container.querySelector('[class*="inlineRadioGroup"]');

const getRadio = (name: string, checked = false) => screen.getByRole('radio', { name, checked });

describe('RadioButtonsLayout', () => {
  it('renders one radio per option, with the selected one checked', () => {
    render({ value: 'sverige' });
    expect(getRadio('Norge')).toBeInTheDocument();
    expect(getRadio('Sverige', true)).toBeInTheDocument();
    expect(getRadio('Danmark')).toBeInTheDocument();
  });

  it('reports the selected option', () => {
    const onChange = vi.fn();
    render({ onChange });
    fireEvent.click(getRadio('Danmark'));
    expect(onChange).toHaveBeenCalledWith('danmark');
  });

  it('renders the legend, its description and help text', async () => {
    render({ title: 'radio.title', description: 'radio.description', help: 'radio.help' });

    expect(screen.getByRole('radiogroup', { name: /Bostedsland/ })).toBeInTheDocument();
    expect(screen.getByText('Velg landet du bor i')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Bostedsland/ }));
    expect(await screen.findByText('Landet der du er folkeregistrert')).toBeInTheDocument();
  });

  it('puts the title prefix in front of the title', () => {
    render({ title: 'radio.title', titlePrefix: 'likert.header' });
    expect(screen.getByRole('radiogroup', { name: /Spørsmål Bostedsland/ })).toBeInTheDocument();
  });

  it('names the help text button after the title with its prefix', () => {
    render({ title: 'radio.title', titlePrefix: 'likert.header', help: 'radio.help' });
    expect(screen.getByRole('button', { name: /Spørsmål Bostedsland/ })).toBeInTheDocument();
  });

  it('shows the required tag with data-indicator', () => {
    const { container } = render({ title: 'radio.title', required: true });
    expect(container.querySelector('[data-indicator="required"]')).toBeInTheDocument();
  });

  it('labels the group with an aria-label when the legend is not rendered', () => {
    render({ title: 'radio.title', renderLegend: false });
    expect(screen.getByRole('radiogroup', { name: 'Bostedsland' })).toBeInTheDocument();
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

  it('renders the options as cards that select on click', () => {
    const onChange = vi.fn();
    render({ showAsCard: true, onChange });
    fireEvent.click(screen.getByTestId('test-id-Sverige'));
    expect(onChange).toHaveBeenCalledWith('sverige');
  });

  it('renders the validation messages passed in by the app', () => {
    render({ validationMessages: 'Du må velge et land' });
    expect(screen.getByText('Du må velge et land')).toBeInTheDocument();
  });

  describe('layout', () => {
    it('lays out three options in a column by default', () => {
      const { container } = render();
      expect(horizontalWrapper(container)).not.toBeInTheDocument();
    });

    it('lays out the options in a row when layout is "row"', () => {
      const { container } = render({ layout: 'row' });
      expect(horizontalWrapper(container)).toBeInTheDocument();
    });

    it('lays out two options in a row by default', () => {
      const { container } = render({ options: land.slice(0, 2) });
      expect(horizontalWrapper(container)).toBeInTheDocument();
    });
  });

  describe('rendered in a table', () => {
    it('hides the label of a single option', () => {
      render({ options: land.slice(0, 1), renderedInTable: true });
      expect(screen.getByText('Norge')).toHaveClass('sr-only');
    });

    it('keeps the label of a single option when showLabelsInTable is set', () => {
      render({ options: land.slice(0, 1), renderedInTable: true, showLabelsInTable: true });
      expect(screen.getByText('Norge')).not.toHaveClass('sr-only');
    });
  });

  describe('alertOnChange', () => {
    // Each option has its own popover. The second one belongs to Sverige.
    const popoverButton = (name: string) =>
      screen.getAllByRole('button', { name, hidden: true })[1];
    const renderWithAlert = (props?: Partial<ComponentProps<typeof RadioButtonsLayout>>) =>
      render({ options: land.slice(0, 2), alertOnChange: true, ...props });

    it('changes without asking when nothing is selected yet', () => {
      const onChange = vi.fn();
      renderWithAlert({ onChange });
      fireEvent.click(getRadio('Sverige'));
      expect(onChange).toHaveBeenCalledWith('sverige');
    });

    it('names the current selection and waits for confirmation', () => {
      const onChange = vi.fn();
      renderWithAlert({ value: 'norge', onChange });

      expect(screen.getAllByText(/Are you sure you want to change from/)[0]).toHaveTextContent(
        'Norge',
      );
      fireEvent.click(getRadio('Sverige'));
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(popoverButton('Confirm'));
      expect(onChange).toHaveBeenCalledWith('sverige');
    });

    it('discards the change when cancelled', () => {
      const onChange = vi.fn();
      renderWithAlert({ value: 'norge', onChange });

      fireEvent.click(getRadio('Sverige'));
      fireEvent.click(popoverButton('Cancel'));
      fireEvent.click(popoverButton('Confirm'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
