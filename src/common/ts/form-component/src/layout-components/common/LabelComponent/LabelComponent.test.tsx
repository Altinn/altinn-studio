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

  it('shows the optional marking by default when not required', () => {
    render({ required: false });
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('hides the optional marking when disabled', () => {
    render({ required: false, showOptionalMarking: false });
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('shows the required marking instead of the optional one when required', () => {
    render({ required: true });
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('renders the help text button and description when given', () => {
    render({ help: 'my.help', description: 'my.description' });
    expect(screen.getByRole('button', { name: /Helptext for First name/i })).toBeInTheDocument();
    expect(screen.getByText('A short description')).toBeInTheDocument();
  });
});
