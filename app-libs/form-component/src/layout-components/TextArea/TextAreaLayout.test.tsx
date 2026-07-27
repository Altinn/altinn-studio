import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextAreaLayout } from './TextAreaLayout';

const render = (
  props?: Partial<ComponentProps<typeof TextAreaLayout>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(<TextAreaLayout componentId='my-textarea' value='' {...props} />, options);

describe('TextAreaLayout', () => {
  it('renders a textarea with the provided value', () => {
    render({ value: 'hello' });
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render({ value: '', onChange });

    await user.type(screen.getByRole('textbox'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onBlur when the textarea loses focus', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render({ onBlur });

    await user.click(screen.getByRole('textbox'));
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('renders a read-only textarea when readOnly is set', () => {
    render({ readOnly: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('renders the label and associates it with the textarea', () => {
    render({ title: 'my.label' }, { overrides: { 'my.label': 'My Label' } });
    expect(screen.getByLabelText('My Label')).toBe(screen.getByRole('textbox'));
  });

  it('renders no label when title is undefined', () => {
    render();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText('My Label')).not.toBeInTheDocument();
  });

  it('uses ariaLabel as the accessible name when no visible label is rendered', () => {
    render({ ariaLabel: 'My hidden label' });
    expect(screen.getByRole('textbox', { name: 'My hidden label' })).toBeInTheDocument();
  });

  it('renders a description when provided', () => {
    render(
      { title: 'my.label', description: 'my.desc' },
      { overrides: { 'my.label': 'My Label', 'my.desc': 'A description' } },
    );
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('associates the description with the textarea when both title and description are set', () => {
    render(
      { title: 'my.label', description: 'my.desc' },
      { overrides: { 'my.label': 'My Label', 'my.desc': 'A description' } },
    );
    // The textarea's accessible description must resolve to the description text, i.e. its
    // aria-describedby points at the description element rendered by LabelComponent.
    const textbox = screen.getByRole('textbox', { description: 'A description' });
    expect(textbox).toHaveAttribute('aria-describedby', 'description-label-my-textarea');
  });

  it('does not associate a description when title is absent', () => {
    render({ description: 'my.desc' }, { overrides: { 'my.desc': 'A description' } });
    // Without a visible label there is no aria-describedby association (mirrors the old gating
    // on the presence of a title in buildAriaDescribedBy).
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('renders a help button when help is provided', () => {
    render(
      { title: 'my.label', help: 'my.help' },
      { overrides: { 'my.label': 'My Label', 'my.help': 'Helpful text' } },
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders a character counter when maxLength is set', () => {
    render({ maxLength: 50 });
    expect(screen.getByText('You have 50 characters left')).toBeInTheDocument();
  });

  it('does not render a character counter when readOnly', () => {
    render({ maxLength: 50, readOnly: true });
    expect(screen.queryByText('You have 50 characters left')).not.toBeInTheDocument();
  });

  it('renders the over-limit counter message when the value exceeds maxLength', () => {
    // Value is 5 characters over the limit, so the `over` string
    // (input_components.exceeded_max_limit) is rendered with the overflow count.
    render({ maxLength: 5, value: 'abcdefghij' });
    expect(
      screen.getByText('You have exceeded the maximum limit with 5 characters'),
    ).toBeInTheDocument();
  });

  it('renders validation messages when provided', () => {
    render({ validationMessages: <span>Error</span> });
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('marks the textarea as invalid when error is set', () => {
    render({ error: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark the textarea as invalid when error is unset', () => {
    render();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('does not render validation area when validationMessages is undefined', () => {
    render({ componentId: 'ta-1' });
    const formContent = document.getElementById('form-content-ta-1');
    expect(formContent).toBeInTheDocument();
    expect(formContent?.children).toHaveLength(1);
  });

  it('renders form-content wrapper with componentId', () => {
    render({ componentId: 'ta-1' });
    expect(document.getElementById('form-content-ta-1')).toBeInTheDocument();
  });
});
