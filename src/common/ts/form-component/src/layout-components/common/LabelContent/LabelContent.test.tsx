import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';

import { LabelContent } from './LabelContent';
import type { LabelContentProps } from './LabelContent';

const overrides = {
  'my.label': 'Fornavn',
  'my.help': 'Skriv navnet slik det står i passet',
  'my.description': 'Vi bruker dette for å henvende oss til deg',
};

describe('LabelContent', () => {
  const render = (props?: Partial<LabelContentProps>) =>
    renderWithTranslations(<LabelContent componentId='example' label='my.label' {...props} />, {
      overrides,
    });

  it('renders the translated label text', () => {
    render();
    expect(screen.getByText('Fornavn')).toBeInTheDocument();
  });

  it('renders no label element of its own', () => {
    const { container } = render();
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders nothing when renderLabel is false', () => {
    const { container } = render({ renderLabel: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the label as required', () => {
    render({ required: true });
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('marks the label as optional by default when not required', () => {
    render({ required: false });
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('hides the optional marking when disabled', () => {
    render({ required: false, showOptionalMarking: false });
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('does not mark a read-only label as optional', () => {
    render({ required: false, readOnly: true });
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('shows neither marking when the component has no notion of being required', () => {
    render();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('renders the help text in a tooltip', async () => {
    render({ help: 'my.help' });
    fireEvent.click(screen.getByRole('button', { name: /Fornavn/ }));
    expect(await screen.findByText('Skriv navnet slik det står i passet')).toBeInTheDocument();
  });

  it('renders the description with an id the control can reference', () => {
    render({ description: 'my.description' });
    expect(screen.getByTestId('description-label-example')).toHaveTextContent(
      'Vi bruker dette for å henvende oss til deg',
    );
  });
});
