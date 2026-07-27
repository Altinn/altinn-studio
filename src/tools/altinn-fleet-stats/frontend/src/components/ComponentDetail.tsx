import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Button, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from './Table';
import { MiniBar } from './Bar';
import { StatBlock } from './StatBlock';

type PropRow = { prop_key: string; occurrences: number; percentage: number };

function PropsSection({
  title,
  description,
  rows,
  accent,
  total,
}: {
  title: string;
  description: string;
  rows: PropRow[];
  accent: 'success' | 'info' | 'neutral' | 'subtle';
  total: number;
}) {
  if (rows.length === 0) return null;
  const color =
    accent === 'success'
      ? 'var(--ds-color-success-base-default)'
      : accent === 'info'
        ? 'var(--ds-color-accent-base-default)'
        : 'var(--ds-color-neutral-text-subtle)';

  return (
    <div className='space-y-2'>
      <div className='flex items-baseline gap-2'>
        <Heading level={4} data-size='2xs'>
          {title}
        </Heading>
        <Tag data-color={accent === 'success' ? 'success' : accent === 'info' ? 'info' : 'neutral'}>
          {rows.length}
        </Tag>
      </div>
      <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
        {description}
      </Paragraph>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.slice(0, 12).map((p) => (
          <li
            key={p.prop_key}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 1fr) 1fr 60px',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.35rem 0',
              borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
              fontSize: '0.875rem',
            }}
          >
            <code style={{ fontFamily: 'ui-monospace, monospace' }}>{p.prop_key}</code>
            <MiniBar value={p.occurrences} max={total} color={color} />
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {p.percentage}%
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 12 && (
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          + {rows.length - 12} flere
        </Paragraph>
      )}
    </div>
  );
}

export function ComponentDetail({ type, onBack }: { type: string; onBack: () => void }) {
  const q = useQuery({
    queryKey: ['component-summary', type],
    queryFn: () => api.componentSummary(type),
  });

  if (q.isLoading) return <Paragraph>Laster…</Paragraph>;
  if (q.isError)
    return <Alert data-color='danger'>Klarte ikke laste detaljer: {String(q.error)}</Alert>;
  if (!q.data) return null;

  const d = q.data;
  const appsPct =
    d.total_apps_in_fleet > 0 ? Math.round((d.total_apps / d.total_apps_in_fleet) * 100) : 0;
  const topAppsMax = d.top_apps[0]?.occurrences ?? 1;

  return (
    <div className='space-y-6'>
      {/* Breadcrumb / back */}
      <div className='flex items-center gap-2'>
        <Button variant='tertiary' data-size='sm' onClick={onBack}>
          ← Tilbake til alle komponenter
        </Button>
      </div>

      {/* Hero */}
      <div className='flex items-baseline gap-3'>
        <Heading level={2} data-size='lg' style={{ fontFamily: 'ui-monospace, monospace' }}>
          {d.type}
        </Heading>
        <Tag data-color='info'>
          Rangering {d.rank} av {d.total_component_types}
        </Tag>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatBlock label='Forekomster totalt' value={d.total_occurrences.toLocaleString('no-NO')} />
        <StatBlock
          label='Apper som bruker'
          value={`${d.total_apps} (${appsPct}%)`}
          hint={`av ${d.total_apps_in_fleet} apper totalt`}
        />
        <StatBlock
          label='Snitt per app'
          value={d.avg_per_app}
          hint={`median ${d.median_per_app}, p90 ${d.p90_per_app}`}
        />
        <StatBlock label='Maks i én app' value={d.max_per_app} />
      </div>

      {/* Distribution + top apps row */}
      <div className='grid grid-cols-12 gap-4'>
        <div className='col-span-12 lg:col-span-6'>
          <Card>
            <Card.Block>
              <Heading level={3} data-size='xs'>
                Hvor mange forekomster har apper?
              </Heading>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Histogram over hvor tett komponenten brukes i hver app.
              </Paragraph>
            </Card.Block>
            <Card.Block>
              <ResponsiveContainer width='100%' height={220}>
                <BarChart data={d.histogram}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='bucket' />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey='apps' fill='var(--ds-color-accent-base-default)' />
                </BarChart>
              </ResponsiveContainer>
            </Card.Block>
          </Card>
        </div>

        <div className='col-span-12 lg:col-span-6'>
          <Card>
            <Card.Block>
              <Heading level={3} data-size='xs'>
                Topp apper
              </Heading>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Apper som bruker {d.type} flest ganger.
              </Paragraph>
            </Card.Block>
            <Card.Block>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {d.top_apps.map((a) => (
                  <li
                    key={a.app_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1fr) 1fr 50px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{a.app_id}</span>
                    <MiniBar value={a.occurrences} max={topAppsMax} />
                    <span
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 500,
                      }}
                    >
                      {a.occurrences}
                    </span>
                  </li>
                ))}
              </ul>
            </Card.Block>
          </Card>
        </div>
      </div>

      {/* Props frequency — the most insight-dense section */}
      <Card>
        <Card.Block>
          <Heading level={3} data-size='xs'>
            Hvordan konfigureres {d.type}?
          </Heading>
          <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Hvilke props som er satt på komponentene, gruppert etter hvor vanlig de er. Prosent =
            andel av alle {d.total_occurrences.toLocaleString('no-NO')} {d.type}-komponenter som har
            property-en.
          </Paragraph>
        </Card.Block>
        <Card.Block>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <PropsSection
              title='Nesten alltid satt'
              description='≥ 80% av komponentene'
              rows={d.props_almost_always}
              accent='success'
              total={d.total_occurrences}
            />
            <PropsSection
              title='Brukes ofte'
              description='30–80% av komponentene'
              rows={d.props_often}
              accent='info'
              total={d.total_occurrences}
            />
            <PropsSection
              title='Brukes av og til'
              description='5–30% av komponentene'
              rows={d.props_sometimes}
              accent='neutral'
              total={d.total_occurrences}
            />
            <PropsSection
              title='Sjelden brukt'
              description='< 5% av komponentene — kandidater for forenkling eller dokumentasjon'
              rows={d.props_rarely}
              accent='subtle'
              total={d.total_occurrences}
            />
          </div>
        </Card.Block>
      </Card>

      {/* All apps using this component with repo links */}
      <AllAppsUsingComponent type={d.type} />
    </div>
  );
}

function AllAppsUsingComponent({ type }: { type: string }) {
  const q = useQuery({
    queryKey: ['component-apps', type],
    queryFn: () => api.appsUsingComponent(type),
  });
  if (q.isLoading) return null;
  const rows = q.data ?? [];
  const max = rows[0]?.occurrences ?? 1;

  return (
    <Card>
      <Card.Block>
        <div className='flex items-baseline gap-2'>
          <Heading level={3} data-size='xs'>
            Alle apper som bruker {type}
          </Heading>
          <Tag data-color='info'>{rows.length} apper</Tag>
        </div>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Sortert etter antall forekomster. Klikk «Åpne i Altinn Studio» for å gå til repoet.
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <Table
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
            { key: 'frontend_version', header: 'Frontend' },
            { key: 'backend_version', header: 'Backend' },
            {
              key: 'occurrences',
              header: 'Forekomster',
              align: 'right',
              render: (r) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 500,
                      minWidth: 30,
                      textAlign: 'right',
                    }}
                  >
                    {r.occurrences}
                  </span>
                  <div style={{ width: 80 }}>
                    <MiniBar value={r.occurrences} max={max} />
                  </div>
                </div>
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
  );
}
