import { ActivityTrail, type ActivityTrailProps } from './ActivityTrail';
import { render, type RenderResult, screen } from '@testing-library/react';
import type { TrailStep } from '../../../../types/WorkflowStatus';

describe('ActivityTrail', () => {
  it('renders nothing when there are no steps', () => {
    const { container } = renderActivityTrail({ steps: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message of every step', () => {
    const steps: TrailStep[] = [
      { id: '0', message: 'Tenker på oppgaven', offsetMs: 0 },
      { id: '1', message: 'Leser FormSpec', offsetMs: 2400 },
      { id: '2', message: 'Skriver layout', offsetMs: 5100 },
    ];
    renderActivityTrail({ steps });
    expect(screen.getByText('Tenker på oppgaven')).toBeInTheDocument();
    expect(screen.getByText('Leser FormSpec')).toBeInTheDocument();
    expect(screen.getByText('Skriver layout')).toBeInTheDocument();
  });

  it('renders a dot element for every visible step', () => {
    const steps: TrailStep[] = [
      { id: '0', message: 'first', offsetMs: 0 },
      { id: '1', message: 'second', offsetMs: 1000 },
      { id: '2', message: 'third', offsetMs: 2000 },
    ];
    renderActivityTrail({ steps });
    expect(screen.getAllByTestId('activity-trail-dot')).toHaveLength(3);
  });

  it('windows the trail to the most recent steps when there are many', () => {
    const steps: TrailStep[] = Array.from({ length: 12 }, (_, index) => ({
      id: `step-${index}`,
      message: `step ${index}`,
      offsetMs: index * 1000,
    }));
    renderActivityTrail({ steps });

    expect(screen.queryByText('step 0')).not.toBeInTheDocument();
    expect(screen.queryByText('step 5')).not.toBeInTheDocument();
    expect(screen.getByText('step 6')).toBeInTheDocument();
    expect(screen.getByText('step 11')).toBeInTheDocument();
  });

  it('formats step offsets as m:ss', () => {
    const steps: TrailStep[] = [
      { id: '0', message: 'first', offsetMs: 0 },
      { id: '1', message: 'second', offsetMs: 8000 },
      { id: '2', message: 'third', offsetMs: 65_500 },
    ];
    renderActivityTrail({ steps });
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('0:08')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });
});

const renderActivityTrail = (props: ActivityTrailProps): RenderResult => {
  return render(<ActivityTrail {...props} />);
};
