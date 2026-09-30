import { render, screen } from '@testing-library/react';

import { Panel } from './Panel';
import type { PanelVariant } from './Panel';

describe('Panel', () => {
  it('renders the title and children', () => {
    render(
      <Panel variant='info' title='Panel Title'>
        Panel Content
      </Panel>,
    );

    expect(screen.getByRole('heading', { name: 'Panel Title' })).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('accepts a ReactNode as title', () => {
    render(
      <Panel variant='info' title={<span data-testid='custom-title'>Custom</span>}>
        Body
      </Panel>,
    );

    expect(screen.getByTestId('custom-title')).toHaveTextContent('Custom');
  });

  it('does not render an icon by default', () => {
    render(
      <Panel variant='info' title='No icon'>
        Body
      </Panel>,
    );

    expect(screen.queryByRole('img', { name: 'info' })).not.toBeInTheDocument();
  });

  it('does not render an icon when showIcon is false', () => {
    render(
      <Panel variant='info' title='No icon' showIcon={false}>
        Body
      </Panel>,
    );

    expect(screen.queryByRole('img', { name: 'info' })).not.toBeInTheDocument();
  });

  it.each<PanelVariant>(['info', 'warning', 'error', 'success'])(
    'renders the matching icon for variant %s when showIcon is true',
    (variant) => {
      render(
        <Panel variant={variant} title='With icon' showIcon>
          Body
        </Panel>,
      );

      expect(screen.getByRole('img', { name: variant })).toBeInTheDocument();
    },
  );

  it('applies the provided className and style', () => {
    const { container } = render(
      <Panel variant='success' className='my-panel' style={{ marginTop: 10 }}>
        Body
      </Panel>,
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('my-panel');
    expect(panel).toHaveStyle({ marginTop: '10px' });
  });
});
