import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { LabelAsSpan } from './LabelAsSpan';

const render = (props?: Partial<ComponentProps<typeof LabelAsSpan>>) =>
  renderWithTranslations(
    <LabelAsSpan componentId='date-1' title='my.title' {...props}>
      <span>20.07.2026</span>
    </LabelAsSpan>,
  );

describe('LabelAsSpan', () => {
  it('shows the title and children', () => {
    render();
    expect(screen.getByText('my.title')).toBeInTheDocument();
    expect(screen.getByText('20.07.2026')).toBeInTheDocument();
  });

  it('sets the label id on the outer field wrapper (includes title + value for aria-labelledby)', () => {
    render({ componentId: 'date-preview' });
    const label = document.getElementById('label-date-preview');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('my.title');
    expect(label).toHaveTextContent('20.07.2026');
    expect(label?.tagName).toBe('SPAN');
  });

  it('keeps the layout wrapper but hides title text when hideLabel is set', () => {
    render({ hideLabel: true });
    expect(screen.queryByText('my.title')).not.toBeInTheDocument();
    expect(screen.getByText('20.07.2026')).toBeInTheDocument();
  });
});
