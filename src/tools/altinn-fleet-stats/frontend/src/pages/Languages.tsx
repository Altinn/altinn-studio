import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from '../components/Table';
import { ChartSkeleton, TableSkeleton } from '../components/Skeletons';

function pct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function LanguagesPage() {
  const q = useQuery({ queryKey: ['languages'], queryFn: api.languages });
  const coverage = useQuery({
    queryKey: ['lang-coverage', 'nb'],
    queryFn: () => api.languageCoverage('nb'),
  });
  const refs = useQuery({ queryKey: ['lang-refs'], queryFn: api.languageReferences });
  const dead = useQuery({ queryKey: ['dead-keys'], queryFn: () => api.deadTextKeys(20, 100) });
  const [drillLang, setDrillLang] = useState<string | null>(null);
  const [deadApp, setDeadApp] = useState<string | null>(null);
  const drill = useQuery({
    queryKey: ['lang-coverage-apps', drillLang],
    queryFn: () => api.languageCoverageByApp(drillLang!),
    enabled: !!drillLang,
  });
  const deadDetails = useQuery({
    queryKey: ['dead-keys-app', deadApp],
    queryFn: () => api.deadTextKeysForApp(deadApp!, 500),
    enabled: !!deadApp,
  });

  return (
    <div className='grid grid-cols-12 gap-6'>
      {/* Top: chart + per-lang counts */}
      <div className='col-span-12 lg:col-span-7 space-y-3'>
        <Heading level={2} data-size='sm'>
          Antall apper per språk
        </Heading>
        {q.isLoading ? (
          <ChartSkeleton height={280} />
        ) : (
          <Card>
            <Card.Block>
              <ResponsiveContainer width='100%' height={280}>
                <BarChart data={q.data?.per_lang ?? []}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='lang_code' />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey='apps' fill='var(--ds-color-accent-base-default, #005db1)' />
                </BarChart>
              </ResponsiveContainer>
            </Card.Block>
          </Card>
        )}
      </div>
      <div className='col-span-12 lg:col-span-5 space-y-3'>
        <Heading level={2} data-size='sm'>
          Antall språk per app
        </Heading>
        <Table
          rows={q.data?.per_app_count ?? []}
          cols={[
            { key: 'lang_count', header: 'Antall språk' },
            { key: 'apps', header: 'Antall apper', align: 'right' },
          ]}
        />
        {(q.data?.apps_without_languages ?? 0) > 0 && (
          <Alert data-color='warning'>
            <Paragraph data-size='sm'>
              Apper uten språkfiler: <strong>{q.data?.apps_without_languages}</strong>
            </Paragraph>
          </Alert>
        )}
      </div>

      {/* Coverage section */}
      <div className='col-span-12 space-y-3'>
        <Heading level={2} data-size='sm'>
          Oversettelsesdekning
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Hvor stor andel av nøklene i <code>resource.nb.json</code> som er oversatt i andre språk.
          Klikk en rad for å se hvilke apper som ligger lavest.
        </Paragraph>
        <Table
          rows={coverage.data ?? []}
          cols={[
            { key: 'lang_code', header: 'Språk' },
            { key: 'apps', header: 'Apper', align: 'right' },
            {
              key: 'avg_coverage',
              header: 'Nøkler dekket (snitt)',
              align: 'right',
              render: (r) => pct(r.avg_coverage),
            },
            {
              key: 'avg_non_empty_coverage',
              header: 'Med tekst (snitt)',
              align: 'right',
              render: (r) => pct(r.avg_non_empty_coverage),
            },
            { key: 'total_missing', header: 'Mangler totalt', align: 'right' },
          ]}
          onRowClick={(r) => setDrillLang(r.lang_code)}
        />
      </div>

      {/* Per-app drilldown */}
      {drillLang && (
        <div className='col-span-12 space-y-3'>
          <div className='flex items-center gap-2'>
            <Heading level={3} data-size='xs'>
              Apper med lavest dekning for «{drillLang}»
            </Heading>
            <Tag data-color='info'>{drill.data?.length ?? 0} apper</Tag>
            <button
              type='button'
              onClick={() => setDrillLang(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'var(--ds-color-neutral-text-subtle)',
                textDecoration: 'underline',
              }}
            >
              Lukk
            </button>
          </div>
          <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Sortert etter laveste dekning først. Apper med færre enn 10 nb-nøkler er filtrert ut.
          </Paragraph>
          <Table
            rows={drill.data ?? []}
            cols={[
              { key: 'app_id', header: 'App' },
              { key: 'org', header: 'Org' },
              { key: 'primary_keys', header: 'nb-nøkler', align: 'right' },
              { key: 'lang_keys', header: `${drillLang}-nøkler`, align: 'right' },
              { key: 'lang_non_empty', header: 'Med tekst', align: 'right' },
              {
                key: 'coverage_pct',
                header: 'Dekning %',
                align: 'right',
                render: (r) => (
                  <Tag
                    data-color={
                      r.coverage_pct >= 90 ? 'success' : r.coverage_pct >= 50 ? 'warning' : 'danger'
                    }
                  >
                    {r.coverage_pct}%
                  </Tag>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* References health */}
      <div className='col-span-12 space-y-3'>
        <Heading level={2} data-size='sm'>
          Tekstreferanser i layouts
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Forholdet mellom <code>textResourceBindings</code> i layouts og faktiske nøkler i{' '}
          <code>resource.nb.json</code>.
        </Paragraph>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <Card>
            <Card.Block>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Tekstreferanser totalt
              </Paragraph>
              <Heading level={3} data-size='md'>
                {refs.data?.total_references ?? '—'}
              </Heading>
            </Card.Block>
          </Card>
          <Card>
            <Card.Block>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Unike nøkler referert
              </Paragraph>
              <Heading level={3} data-size='md'>
                {refs.data?.unique_keys_referenced ?? '—'}
              </Heading>
            </Card.Block>
          </Card>
          <Card>
            <Card.Block>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Refererte nøkler som mangler i nb
              </Paragraph>
              <Heading
                level={3}
                data-size='md'
                style={{
                  color:
                    (refs.data?.references_with_missing_nb_key ?? 0) > 0
                      ? 'var(--ds-color-danger-text-default)'
                      : undefined,
                }}
              >
                {refs.data?.references_with_missing_nb_key ?? '—'}
              </Heading>
            </Card.Block>
          </Card>
          <Card>
            <Card.Block>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Definerte nb-nøkler aldri brukt
              </Paragraph>
              <Heading
                level={3}
                data-size='md'
                style={{
                  color:
                    (refs.data?.unused_nb_keys ?? 0) > 0
                      ? 'var(--ds-color-warning-text-default)'
                      : undefined,
                }}
              >
                {refs.data?.unused_nb_keys ?? '—'}
              </Heading>
            </Card.Block>
          </Card>
        </div>

        {(refs.data?.empty_per_lang?.length ?? 0) > 0 && (
          <div>
            <Heading level={3} data-size='xs'>
              Tomme oversettelser per språk
            </Heading>
            <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Nøkler som er definert med tom <code>value</code>.
            </Paragraph>
            <Table
              rows={refs.data?.empty_per_lang ?? []}
              cols={[
                { key: 'lang_code', header: 'Språk' },
                { key: 'empty_count', header: 'Tomme nøkler', align: 'right' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Dead text resources */}
      <div className='col-span-12 space-y-3'>
        <Heading level={2} data-size='sm'>
          Død tekstressurs per app
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Apper sortert etter flest <code>resource.nb.json</code>-nøkler som aldri refereres via{' '}
          <code>textResourceBindings</code> i layouts. Klikk for å se de faktiske nøklene.
        </Paragraph>
        <Alert data-color='info'>
          <Paragraph data-size='xs'>
            <strong>Mulige falske positive:</strong> nøkler brukt via expression (
            <code>["lookup", ...]</code>) eller fra custom kode/PDF/Summary blir også talt som
            ubrukte. Tomme verdier og placeholder-tekster vises egne.
          </Paragraph>
        </Alert>
        <Table
          rows={dead.data ?? []}
          cols={[
            { key: 'app_id', header: 'App' },
            { key: 'org', header: 'Org' },
            { key: 'defined_keys', header: 'Nøkler totalt', align: 'right' },
            { key: 'used_keys', header: 'Brukt', align: 'right' },
            { key: 'unused_keys', header: 'Ubrukt', align: 'right' },
            {
              key: 'unused_pct',
              header: 'Ubrukt %',
              align: 'right',
              render: (r) => (
                <Tag
                  data-color={
                    r.unused_pct >= 80 ? 'danger' : r.unused_pct >= 50 ? 'warning' : 'neutral'
                  }
                >
                  {r.unused_pct}%
                </Tag>
              ),
            },
          ]}
          onRowClick={(r) => setDeadApp(r.app_id)}
        />

        {deadApp && (
          <Card>
            <Card.Block>
              <div className='flex items-center gap-2'>
                <Heading level={3} data-size='xs'>
                  Ubrukte nøkler i {deadApp}
                </Heading>
                <Tag data-color='info'>{deadDetails.data?.length ?? 0} nøkler</Tag>
                <button
                  type='button'
                  onClick={() => setDeadApp(null)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--ds-color-neutral-text-subtle)',
                    textDecoration: 'underline',
                  }}
                >
                  Lukk
                </button>
              </div>
            </Card.Block>
            <Card.Block>
              <ul
                style={{
                  maxHeight: '30rem',
                  overflow: 'auto',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.6,
                }}
              >
                {(deadDetails.data ?? []).map((k, i) => (
                  <li
                    key={i}
                    style={{
                      color: k.is_empty ? 'var(--ds-color-neutral-text-subtle)' : undefined,
                    }}
                  >
                    {k.key_id}
                    {k.is_empty ? (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          color: 'var(--ds-color-warning-text-default)',
                        }}
                      >
                        (tom verdi)
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card.Block>
          </Card>
        )}
      </div>
    </div>
  );
}
