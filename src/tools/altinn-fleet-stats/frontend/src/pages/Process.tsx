import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { MiniBar } from '../components/Bar';
import { StatBlock } from '../components/StatBlock';
import { ProcessDrilldown } from '../components/ProcessDrilldown';
import { ListCardSkeleton, StatsRowSkeleton } from '../components/Skeletons';
import { EmptyState } from '../components/EmptyState';

type Drill =
  | { kind: 'task_count'; value: number }
  | { kind: 'task_type'; value: string }
  | { kind: 'complexity'; value: string };

const COMPLEXITY_LABEL: Record<string, string> = {
  linear: 'Lineær flyt',
  branching: 'Forgrening (gateway)',
  complex: 'Kompleks (>200 reiser)',
  none: 'Ingen BPMN-info',
  '(ukjent)': 'Ukjent',
};

export function ProcessPage() {
  const [drill, setDrill] = useState<Drill | null>(null);
  const q = useQuery({ queryKey: ['process'], queryFn: api.process });

  if (drill) {
    return <ProcessDrilldown mode={drill} onBack={() => setDrill(null)} />;
  }

  if (q.isLoading) {
    return (
      <div className='space-y-6'>
        <StatsRowSkeleton count={4} />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <ListCardSkeleton rows={6} />
          <ListCardSkeleton rows={5} />
        </div>
      </div>
    );
  }

  if (q.data && q.data.per_task_count.length === 0) {
    return (
      <EmptyState
        title='Ingen prosess-data ennå'
        description='Kjør Re-analyser på Oversikt for å parse process.bpmn for hver app — så vises antall steg, gateways og brukerreiser her.'
      />
    );
  }

  const total = (q.data?.per_task_count ?? []).reduce((a, b) => a + b.apps, 0);
  const single = q.data?.per_task_count.find((r) => r.task_count === 1)?.apps ?? 0;
  const multi = (q.data?.per_task_count ?? [])
    .filter((r) => r.task_count > 1)
    .reduce((a, b) => a + b.apps, 0);
  const maxSteps = (q.data?.per_task_count ?? []).reduce((m, r) => Math.max(m, r.task_count), 0);
  const withBranches = q.data?.apps_with_branches ?? 0;

  return (
    <div className='space-y-6'>
      {/* KPI-strip */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatBlock label='Apper med prosess' value={total} />
        <StatBlock
          label='Kun utfylling'
          value={single}
          hint={`${total > 0 ? Math.round((single / total) * 100) : 0}% av appene`}
        />
        <StatBlock
          label='Flere prosesssteg'
          value={multi}
          hint={`${total > 0 ? Math.round((multi / total) * 100) : 0}% av appene`}
        />
        <StatBlock
          label='Med forgrening'
          value={withBranches}
          hint='BPMN har gateway → flere brukerreiser'
        />
      </div>

      <Alert data-color='info'>
        <Heading level={3} data-size='2xs'>
          BPMN-definisjon vs faktisk brukerreise
        </Heading>
        <Paragraph data-size='sm'>
          <strong>Antall steg</strong> teller alle <code>bpmn:task</code>-elementer som er definert.{' '}
          <strong>Brukerreise</strong> følger sequence flows fra start til slutt og resolver
          gateway-valg, så bruker faktisk går gjennom færre steg. Eksempel:{' '}
          <code>din-innsending</code> har 8 tasks i BPMN, men 7 distinkte brukerreiser à 2 steg
          (forside + valgt skjema).
        </Paragraph>
      </Alert>

      {/* Distribution-kort */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <TaskCountCard
          rows={q.data?.per_task_count ?? []}
          onPick={(n) => setDrill({ kind: 'task_count', value: n })}
        />
        <ComplexityCard
          rows={q.data?.per_complexity ?? []}
          onPick={(c) => setDrill({ kind: 'complexity', value: c })}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <JourneyLengthCard rows={q.data?.per_journey_length ?? []} />
        <TaskTypeCard
          rows={q.data?.per_task_type ?? []}
          onPick={(t) => setDrill({ kind: 'task_type', value: t })}
        />
      </div>

      {maxSteps > 0 && (
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Lengste prosess: {maxSteps} BPMN-tasks.
        </Paragraph>
      )}
    </div>
  );
}

function TaskCountCard({
  rows,
  onPick,
}: {
  rows: Array<{ task_count: number; apps: number }>;
  onPick: (n: number) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.apps));
  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size='xs'>
          BPMN-steg per app
        </Heading>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          1:1 mot <code>process.bpmn</code>. Klikk for å se hvilke apper.
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <ListRow
              key={r.task_count}
              label={`${r.task_count} steg`}
              value={r.apps}
              max={max}
              onClick={() => onPick(r.task_count)}
            />
          ))}
        </ul>
      </Card.Block>
    </Card>
  );
}

function JourneyLengthCard({ rows }: { rows: Array<{ length: number; apps: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.apps));
  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size='xs'>
          Lengde på brukerreise
        </Heading>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Antall steg en sluttbruker faktisk går gjennom (lengste reise per app, etter at gateways
          er resolvert).
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <ListRow
              key={r.length}
              label={`${r.length} ${r.length === 1 ? 'steg' : 'steg'}`}
              value={r.apps}
              max={max}
            />
          ))}
        </ul>
      </Card.Block>
    </Card>
  );
}

function ComplexityCard({
  rows,
  onPick,
}: {
  rows: Array<{ complexity: string; apps: number }>;
  onPick: (c: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.apps));
  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size='xs'>
          Prosess-kompleksitet
        </Heading>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Lineær = ingen gateway. Forgrening = exclusive/parallel gateway. Klikk for å se appene.
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <ListRow
              key={r.complexity}
              label={COMPLEXITY_LABEL[r.complexity] ?? r.complexity}
              value={r.apps}
              max={max}
              onClick={() => onPick(r.complexity)}
            />
          ))}
        </ul>
      </Card.Block>
    </Card>
  );
}

function TaskTypeCard({
  rows,
  onPick,
}: {
  rows: Array<{ task_type: string; occurrences: number; apps_using: number }>;
  onPick: (t: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.apps_using));
  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size='xs'>
          Task-typer i bruk
        </Heading>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Altinn-task-typer definert i <code>process.bpmn</code>. Klikk for å se hvilke apper bruker
          dem.
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <ListRow
              key={r.task_type}
              label={r.task_type}
              labelMono
              value={r.apps_using}
              max={max}
              onClick={() => onPick(r.task_type)}
            />
          ))}
        </ul>
      </Card.Block>
    </Card>
  );
}

function ListRow({
  label,
  value,
  max,
  onClick,
  labelMono,
}: {
  label: string;
  value: number;
  max: number;
  onClick?: () => void;
  labelMono?: boolean;
}) {
  return (
    <li
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, auto) 1fr 50px',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.45rem 0.25rem',
        borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
        cursor: onClick ? 'pointer' : undefined,
        fontSize: '0.875rem',
      }}
      onMouseEnter={(e) =>
        onClick && (e.currentTarget.style.background = 'var(--ds-color-neutral-surface-hover)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
    >
      <span
        style={{
          fontFamily: labelMono ? 'ui-monospace, monospace' : undefined,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <MiniBar value={value} max={max} />
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
        {value}
      </span>
    </li>
  );
}
