import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Text } from './Text';

describe('Text', () => {
  it('renders only the value when no title is set', () => {
    renderWithTranslations(<Text componentId='text-1' value='Ola Nordmann' />);
    expect(screen.getByText('Ola Nordmann')).toBeInTheDocument();
    expect(document.getElementById('form-content-text-1')).not.toBeInTheDocument();
  });

  it('still renders the icon when there is no title', () => {
    const { container } = renderWithTranslations(
      <Text componentId='text-1' value='Ola Nordmann' icon='https://example.com/icon.svg' />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.svg');
    expect(img).toHaveAttribute('alt', '');
  });

  it('renders the title, value and the form-content wrapper when a title is set', () => {
    renderWithTranslations(<Text componentId='text-1' title='my.title' value='Ola Nordmann' />, {
      overrides: { 'my.title': 'Navn' },
    });
    expect(screen.getByText('Navn')).toBeInTheDocument();
    expect(screen.getByText('Ola Nordmann')).toBeInTheDocument();
    expect(document.getElementById('form-content-text-1')).toBeInTheDocument();
  });

  it('keeps title and description outside the form-content wrapper (value only inside)', () => {
    renderWithTranslations(
      <Text componentId='text-1' title='my.title' description='my.desc' value='Ola Nordmann' />,
      { overrides: { 'my.title': 'Navn', 'my.desc': 'En beskrivelse' } },
    );
    const formContent = document.getElementById('form-content-text-1');
    expect(formContent).toBeInTheDocument();
    expect(formContent).toHaveTextContent('Ola Nordmann');
    expect(formContent).not.toHaveTextContent('Navn');
    expect(formContent).not.toHaveTextContent('En beskrivelse');
  });

  it('links the displayed value to the title for screen readers', () => {
    renderWithTranslations(<Text componentId='text-1' title='my.title' value='Ola Nordmann' />, {
      overrides: { 'my.title': 'Navn' },
    });
    expect(screen.getByText('Ola Nordmann')).toHaveAttribute('aria-labelledby', 'label-text-1');
    expect(document.getElementById('label-text-1')).toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderWithTranslations(
      <Text componentId='text-1' title='my.title' help='my.help' value='x' />,
      {
        overrides: { 'my.title': 'Navn', 'my.help': 'Hjelpetekst' },
      },
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders the description when a description key is supplied', () => {
    renderWithTranslations(
      <Text componentId='text-1' title='my.title' description='my.desc' value='x' />,
      {
        overrides: { 'my.title': 'Navn', 'my.desc': 'En beskrivelse' },
      },
    );
    expect(screen.getByText('En beskrivelse')).toBeInTheDocument();
  });

  it('renders an icon with the title as alt text when an icon url is supplied', () => {
    renderWithTranslations(
      <Text componentId='text-1' title='my.title' icon='https://example.com/icon.svg' value='x' />,
      { overrides: { 'my.title': 'Navn' } },
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.svg');
    expect(img).toHaveAttribute('alt', 'Navn');
  });
});
