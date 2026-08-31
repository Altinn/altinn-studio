import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { LabelComponent } from './LabelComponent';
import type { ILabelComponentProps } from './LabelComponent';

const overrides = {
  'my.title': 'First name',
  'my.help': 'Helpful explanation',
  'my.description': 'A short description',
};

describe('LabelComponent', () => {
  const render = (props?: Partial<ILabelComponentProps>) =>
    renderWithTranslations(
      <LabelComponent htmlFor='example' title='my.title' {...props}>
        <input id='example' />
      </LabelComponent>,
      { overrides },
    );

  it('renders the translated label text', () => {
    render();
    expect(screen.getByText('First name')).toBeInTheDocument();
  });

  it('renders only the children when no title is given', () => {
    render({ title: undefined });
    expect(screen.queryByText('First name')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows the optional marking when enabled and not required', () => {
    render({ showOptionalMarking: true });
    expect(screen.getByText(/\(optional\)/i)).toBeInTheDocument();
  });

  it('does not show the optional marking when required', () => {
    render({ required: true, showOptionalMarking: true });
    expect(screen.queryByText(/\(optional\)/i)).not.toBeInTheDocument();
  });

  it('renders the help text button and description when given', () => {
    render({ help: 'my.help', description: 'my.description' });
    expect(screen.getByRole('button', { name: /Helptext for First name/i })).toBeInTheDocument();
    expect(screen.getByText('A short description')).toBeInTheDocument();
  });
});
