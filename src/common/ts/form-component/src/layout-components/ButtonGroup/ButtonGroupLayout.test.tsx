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

  it('renders validation messages when provided', () => {
    renderWithTranslations(
      <ButtonGroupLayout id='bg' validationMessages={<span>Error msg</span>} />,
    );
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('does not render validation area when validationMessages is undefined', () => {
    renderWithTranslations(
      <ButtonGroupLayout id='bg' componentId='bg-1'>
        <button type='button'>Child</button>
      </ButtonGroupLayout>,
    );
    // The form-content wrapper should contain only the inner content Flex,
    // with no second validation Flex appended.
    const formContent = document.getElementById('form-content-bg-1');
    expect(formContent).toBeInTheDocument();
    expect(formContent?.children).toHaveLength(1);
  });

  it('renders form-content wrapper with componentId', () => {
    renderWithTranslations(
      <ButtonGroupLayout id='bg' componentId='bg-1'>
        <button type='button'>Child</button>
      </ButtonGroupLayout>,
    );
    expect(document.getElementById('form-content-bg-1')).toBeInTheDocument();
  });

  it('does not render form-content wrapper when componentId is undefined', () => {
    const { container } = renderWithTranslations(
      <ButtonGroupLayout id='bg'>
        <button type='button'>Child</button>
      </ButtonGroupLayout>,
    );
    expect(container.querySelector('[id^="form-content-"]')).not.toBeInTheDocument();
  });
});
