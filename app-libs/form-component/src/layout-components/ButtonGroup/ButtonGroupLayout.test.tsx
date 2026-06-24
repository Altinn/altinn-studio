import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { ButtonGroupLayout } from './ButtonGroupLayout';

describe('ButtonGroupLayout', () => {
  it('renders the legend from a title text resource key', () => {
    renderWithTranslations(<ButtonGroupLayout id='bg' title='my.title' />, {
      overrides: { 'my.title': 'Action buttons' },
    });
    expect(screen.getByText('Action buttons')).toBeInTheDocument();
  });

  it('renders children inside the flex container', () => {
    renderWithTranslations(
      <ButtonGroupLayout id='bg' title='my.title'>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </ButtonGroupLayout>,
      { overrides: { 'my.title': 'Actions' } },
    );
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
  });

  it('does not render a legend when title is undefined', () => {
    const { container } = renderWithTranslations(
      <ButtonGroupLayout id='bg' title={undefined}>
        <span>child</span>
      </ButtonGroupLayout>,
    );
    expect(container.querySelector('legend')).not.toBeInTheDocument();
  });

  it('renders a description when provided', () => {
    renderWithTranslations(<ButtonGroupLayout id='bg' title='my.title' description='my.desc' />, {
      overrides: { 'my.title': 'Actions', 'my.desc': 'Some description' },
    });
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('does not render a description when not provided', () => {
    renderWithTranslations(<ButtonGroupLayout id='bg' title='my.title' />, {
      overrides: { 'my.title': 'Actions' },
    });
    expect(screen.queryByTestId('description-label-bg')).not.toBeInTheDocument();
  });

  it('renders a help button when help is provided', () => {
    renderWithTranslations(<ButtonGroupLayout id='bg' title='my.title' help='my.help' />, {
      overrides: { 'my.title': 'Actions', 'my.help': 'Helpful text' },
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render a help button when help is not provided', () => {
    renderWithTranslations(<ButtonGroupLayout id='bg' title='my.title' />, {
      overrides: { 'my.title': 'Actions' },
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders children when no legend/description/help', () => {
    renderWithTranslations(
      <ButtonGroupLayout id='bg'>
        <button type='button'>Only child</button>
      </ButtonGroupLayout>,
    );
    expect(screen.getByRole('button', { name: 'Only child' })).toBeInTheDocument();
  });
});
