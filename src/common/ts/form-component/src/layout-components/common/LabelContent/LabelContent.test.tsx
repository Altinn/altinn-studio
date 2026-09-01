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
    expect(screen.getByLabelText('Required')).toHaveTextContent('*');
  });

  it('marks the label as optional when showOptionalMarking is set', () => {
    render({ showOptionalMarking: true });
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('does not mark a read-only label as optional', () => {
    render({ showOptionalMarking: true, readOnly: true });
    expect(screen.queryByText('(Optional)')).not.toBeInTheDocument();
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
