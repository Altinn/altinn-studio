import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from './Table';

type Mode =
  | { kind: 'task_count'; value: number }
  | { kind: 'task_type'; value: string }
  | { kind: 'complexity'; value: string };

type AppRow = {
  app_id: string;
  org: string;
  task_count: number;
  gateway_count: number;
  journey_count: number;
  max_journey_length: number;
  complexity: string;
  primary_journey: string;
  task_sequence?: string;
  gitea_url: string;
};

export function ProcessDrilldown({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  const q = useQuery<AppRow[]>({
    queryKey: ['process-drill', mode.kind, mode.value],
    queryFn: async () => {
      if (mode.kind === 'task_count') return api.processApps({ exactTasks: mode.value });
      if (mode.kind === 'task_type') return api.processApps({ taskType: mode.value });
      return api.processComplexityApps(mode.value);
    },
  });

  if (q.isLoading) return <Paragraph>Laster…</Paragraph>;
  if (q.isError) return <Alert data-color='danger'>Klarte ikke laste: {String(q.error)}</Alert>;
  const rows = q.data ?? [];

  const title =
    mode.kind === 'task_count'
      ? `Apper med ${mode.value} steg`
      : mode.kind === 'task_type'
        ? `Apper med «${mode.value}»-task`
        : `Kompleksitet: ${mode.value}`;

  const subtitle =
    mode.kind === 'task_count'
      ? 'Antall BPMN-tasks definert. Brukerreise kan være kortere hvis prosessen har gateway.'
      : mode.kind === 'task_type'
        ? 'Disse appene har minst én task av denne typen et sted i prosessen.'
        : 'Kompleksitet basert på antall mulige brukerreiser etter at gateways er resolvert.';

  return (
    <div className='space-y-5'>
      <div className='flex items-center gap-2'>
        <Button variant='tertiary' data-size='sm' onClick={onBack}>
          ← Tilbake til prosess-oversikt
        </Button>
      </div>

      <div className='flex items-baseline gap-3 flex-wrap'>
        <Heading level={2} data-size='lg'>
          {title}
        </Heading>
        <Tag data-color='info'>{rows.length} apper</Tag>
      </div>
      <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
        {subtitle}
      </Paragraph>

      <Card>
        <Card.Block>
          <Table<AppRow>
            rows={rows}
            cols={[
              {
                key: 'app_id',
                header: 'App',
                render: (r) => (
                  <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}>
                    {r.app_id}
                  </code>
                ),
              },
              { key: 'org', header: 'Org' },
              {
                key: 'task_count',
                header: 'Steg (BPMN)',
                align: 'right',
                render: (r) => (
                  <Tag
                    data-color={
                      r.task_count >= 5 ? 'danger' : r.task_count >= 3 ? 'warning' : 'info'
                    }
                  >
                    {r.task_count}
                  </Tag>
                ),
              },
              {
                key: 'max_journey_length',
                header: 'Brukerreise',
                align: 'right',
                render: (r) =>
                  r.journey_count === 0 ? (
                    <span style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>—</span>
                  ) : r.journey_count === 1 ? (
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.max_journey_length}
                    </span>
                  ) : (
                    <span
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      title={`${r.journey_count} distinkte reiser`}
                    >
                      {r.max_journey_length}
                      <span style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                        {' '}
                        × {r.journey_count}
                      </span>
                    </span>
                  ),
              },
              {
                key: 'primary_journey',
                header: 'Brukerreise-sekvens',
                render: (r) => (
                  <span
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.75rem',
                      color: 'var(--ds-color-neutral-text-subtle)',
                    }}
                    title={r.task_sequence ? `Hele BPMN: ${r.task_sequence}` : r.primary_journey}
                  >
                    {r.primary_journey || '—'}
                  </span>
                ),
              },
              {
                key: 'gitea_url',
                header: 'Repo',
                align: 'right',
                render: (r) =>
                  r.gitea_url ? (
                    <a
                      href={r.gitea_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={{
                        color: 'var(--ds-color-accent-text-default)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Åpne i Altinn Studio ↗
                    </a>
                  ) : (
                    <span style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>—</span>
                  ),
              },
            ]}
          />
        </Card.Block>
      </Card>
    </div>
  );
}
