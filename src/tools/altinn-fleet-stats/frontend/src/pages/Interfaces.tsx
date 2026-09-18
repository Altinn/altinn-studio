import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Card,
  Field,
  Heading,
  Label,
  Paragraph,
  Select,
  Switch,
  Tag,
  Textfield,
} from '@digdir/designsystemet-react';
import { api, type InterfaceRow, type OutsideCatalogRow } from '../lib/api';
import { Table } from '../components/Table';
import { MiniBar } from '../components/Bar';
import { StatBlock } from '../components/StatBlock';
import { EmptyState } from '../components/EmptyState';
import { InterfaceDetail } from '../components/InterfaceDetail';

type UsageFilter = 'all' | 'implemented' | 'used' | 'unused';
type SortKey = 'most' | 'least' | 'name';

const BUCKET_LABEL: Record<string, string> = {
  none: 'Ingen',
  '1': '1 app',
  '2-5': '2–5',
  '6-20': '6–20',
  '21-100': '21–100',
  '100+': '100+',
};

const AREA_LABEL: Record<string, string> = {
  Features: 'Features — utvidelsespunkter og tjenester',
  Internal: 'Internal — intern infrastruktur',
  EFormidling: 'eFormidling',
  Fiks: 'Fiks',
  Models: 'Models',
};

const mono = { fontFamily: 'ui-monospace, monospace' };
const subtle = { color: 'var(--ds-color-neutral-text-subtle)' };

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('no-NO');
}

export function InterfacesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [area, setArea] = useState('all');
  const [usage, setUsage] = useState<UsageFilter>('all');
  const [onlyExtensionPoints, setOnlyExtensionPoints] = useState(false);
  const [sort, setSort] = useState<SortKey>('most');

  // The whole catalog is a few hundred rows, so it is fetched once and every
  // filter below runs in the browser — the list stays instant while you explore.
  const list = useQuery({
    queryKey: ['interfaces'],
    queryFn: () => api.interfaces({ limit: 1000 }),
  });
  const overview = useQuery({
    queryKey: ['interfaces-overview'],
    queryFn: () => api.interfacesOverview(),
  });
  const outside = useQuery({
    queryKey: ['interfaces-outside'],
    queryFn: () => api.interfacesOutsideCatalog('unknown', 50),
  });
  const topApps = useQuery({
    queryKey: ['interfaces-top-apps'],
    queryFn: () => api.interfaceTopApps(15),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = (list.data ?? []).filter((r) => {
      if (onlyExtensionPoints && !r.implementable_by_apps) return false;
      if (area !== 'all' && r.area !== area) return false;
      if (usage === 'implemented' && r.apps_implementing === 0) return false;
      if (usage === 'used' && r.apps_using === 0) return false;
      if (usage === 'unused' && r.apps_using > 0) return false;
      if (needle) {
        const haystack = `${r.name} ${r.namespace} ${r.summary}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'no'));
    } else if (sort === 'least') {
      sorted.sort(
        (a, b) => a.apps_using - b.apps_using || a.name.localeCompare(b.name, 'no'),
      );
    } else {
      sorted.sort(
        (a, b) =>
          b.apps_implementing - a.apps_implementing ||
          b.apps_using - a.apps_using ||
          a.name.localeCompare(b.name, 'no'),
      );
    }
    return sorted;
  }, [list.data, q, area, usage, onlyExtensionPoints, sort]);

  if (selected) {
    return (
      <InterfaceDetail
        name={selected}
        onBack={() => setSelected(null)}
        onPick={(name) => setSelected(name)}
      />
    );
  }

  const o = overview.data;
  const maxApps = Math.max(1, ...(list.data ?? []).map((r) => r.apps_using));
  const areas = o?.by_area ?? [];
  const isEmpty = !list.isLoading && (list.data?.length ?? 0) === 0;

  return (
    <div className='space-y-5'>
      <div>
        <Heading level={2} data-size='sm'>
          Grensesnitt
        </Heading>
        <Paragraph data-size='sm' style={subtle}>
          Alle offentlige grensesnitt i Altinn.App-bibliotekene, og hvor mange apper som faktisk
          implementerer, registrerer eller bruker dem. Klikk en rad for å se hvem som bruker
          grensesnittet og hvordan.
          {o?.catalog?.lib_version ? (
            <>
              {' '}
              Katalogen er hentet fra <strong>Altinn.App {o.catalog.lib_version}</strong>
              {formatDate(o.catalog.generated_at)
                ? ` (oppdatert ${formatDate(o.catalog.generated_at)})`
                : ''}
              .
            </>
          ) : null}
        </Paragraph>
      </div>

      {isEmpty ? (
        <EmptyState
          title='Ingen grensesnitt analysert ennå'
          description='Kjør Hent apper og deretter Re-analyser, så leses appenes C#-kode og sammenstilles mot katalogen over bibliotekets grensesnitt.'
        />
      ) : (
        <>
          {o && (
            <div className='grid grid-cols-2 lg:grid-cols-5 gap-3'>
              <StatBlock
                label='Grensesnitt i katalogen'
                value={o.catalog_total.toLocaleString('no-NO')}
                hint={`${o.implementable_total} er merket som utvidelsespunkter`}
              />
              <StatBlock
                label='I bruk ute i flåten'
                value={o.used_total.toLocaleString('no-NO')}
                hint={`${o.implemented_total} blir implementert av minst én app`}
                accent='success'
              />
              <StatBlock
                label='Ingen bruker'
                value={o.unused_total.toLocaleString('no-NO')}
                hint='Ingen app rører dem i det hele tatt'
              />
              <StatBlock
                label='Utvidelsespunkt uten bruk'
                value={o.implementable_unused.toLocaleString('no-NO')}
                hint='Ment for apper, men ingen tar dem i bruk'
                accent={o.implementable_unused > 0 ? 'warning' : 'default'}
              />
              <StatBlock
                label='Utdaterte i bruk'
                value={o.obsolete_in_use.toLocaleString('no-NO')}
                hint='Merket obsolete, men fortsatt implementert'
                accent={o.obsolete_in_use > 0 ? 'danger' : 'default'}
              />
            </div>
          )}

          {o && (
            <div className='grid lg:grid-cols-2 gap-4'>
              <Card>
                <Card.Block>
                  <Heading level={3} data-size='xs'>
                    Hvor mange apper bruker hvert grensesnitt?
                  </Heading>
                  <Paragraph data-size='xs' style={subtle}>
                    Fordelingen viser hvor tyngdepunktet ligger: et fåtall grensesnitt bærer
                    mesteparten av bruken, mens en lang hale nesten ingen kjenner til.
                  </Paragraph>
                </Card.Block>
                <Card.Block>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={o.adoption_buckets.map((b) => ({
                          ...b,
                          label: BUCKET_LABEL[b.bucket] ?? b.bucket,
                        }))}
                      >
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='label' tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v} grensesnitt`, 'Antall']} />
                        <Bar dataKey='interfaces' fill='var(--ds-color-accent-base-default)' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Block>
              </Card>

              <Card>
                <Card.Block>
                  <Heading level={3} data-size='xs'>
                    Dekning per område
                  </Heading>
                  <Paragraph data-size='xs' style={subtle}>
                    Hvor stor andel av grensesnittene i hvert område som er tatt i bruk.
                  </Paragraph>
                </Card.Block>
                <Card.Block>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {areas.map((a) => (
                      <li
                        key={a.area}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(90px, 140px) 1fr 76px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          padding: '0.4rem 0',
                          borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <span>{a.area}</span>
                        <MiniBar value={a.used} max={a.total} />
                        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {a.used} / {a.total}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card.Block>
              </Card>
            </div>
          )}

          <div className='flex items-end gap-3 flex-wrap'>
            <div style={{ minWidth: 260, flex: '1 1 260px' }}>
              <Textfield
                label='Søk'
                data-size='sm'
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='IDataProcessor, validering, signering …'
              />
            </div>
            <Field>
              <Label>Område</Label>
              <Select
                data-size='sm'
                value={area}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setArea(e.target.value)}
              >
                <Select.Option value='all'>Alle områder</Select.Option>
                {areas.map((a) => (
                  <Select.Option key={a.area} value={a.area}>
                    {AREA_LABEL[a.area] ?? a.area}
                  </Select.Option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Bruk</Label>
              <Select
                data-size='sm'
                value={usage}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setUsage(e.target.value as UsageFilter)
                }
              >
                <Select.Option value='all'>Alle</Select.Option>
                <Select.Option value='implemented'>Implementeres av apper</Select.Option>
                <Select.Option value='used'>Brukt på en eller annen måte</Select.Option>
                <Select.Option value='unused'>Ingen bruker</Select.Option>
              </Select>
            </Field>
            <Field>
              <Label>Sortering</Label>
              <Select
                data-size='sm'
                value={sort}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSort(e.target.value as SortKey)
                }
              >
                <Select.Option value='most'>Mest brukt først</Select.Option>
                <Select.Option value='least'>Minst brukt først</Select.Option>
                <Select.Option value='name'>Navn (A–Å)</Select.Option>
              </Select>
            </Field>
            <div style={{ marginBottom: '0.35rem' }}>
              <Switch
                data-size='sm'
                label='Kun utvidelsespunkter'
                checked={onlyExtensionPoints}
                onChange={(e) => setOnlyExtensionPoints(e.target.checked)}
              />
            </div>
          </div>

          <Paragraph data-size='xs' style={subtle}>
            Viser {rows.length.toLocaleString('no-NO')} av{' '}
            {(list.data?.length ?? 0).toLocaleString('no-NO')} grensesnitt
            {o ? ` · flåten består av ${o.total_apps.toLocaleString('no-NO')} apper, ${o.apps_implementing.toLocaleString('no-NO')} av dem implementerer minst ett grensesnitt` : ''}
            .
          </Paragraph>

          <Table<InterfaceRow>
            loading={list.isLoading}
            rows={rows}
            emptyTitle='Ingen grensesnitt matcher filteret'
            emptyDescription='Prøv et bredere søk, et annet område, eller skru av «Kun utvidelsespunkter».'
            cols={[
              {
                key: 'name',
                header: 'Grensesnitt',
                render: (r) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <code style={{ ...mono, fontWeight: 500 }}>{r.name}</code>
                      {r.implementable_by_apps && (
                        <Tag data-color='success' data-size='sm'>
                          Utvidelsespunkt
                        </Tag>
                      )}
                      {r.is_obsolete && (
                        <Tag data-color='warning' data-size='sm'>
                          Utdatert
                        </Tag>
                      )}
                      {r.area === 'Internal' && (
                        <Tag data-color='neutral' data-size='sm'>
                          Intern
                        </Tag>
                      )}
                    </span>
                    {r.summary && (
                      <span style={{ ...subtle, fontSize: '0.75rem' }}>
                        {r.summary.length > 120 ? `${r.summary.slice(0, 120)}…` : r.summary}
                      </span>
                    )}
                  </div>
                ),
              },
              { key: 'group_name', header: 'Område' },
              {
                key: 'apps_implementing',
                header: 'Implementerer',
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
                        minWidth: 44,
                        textAlign: 'right',
                      }}
                    >
                      {r.apps_implementing.toLocaleString('no-NO')}
                    </span>
                    <div style={{ width: 110 }}>
                      <MiniBar
                        value={r.apps_implementing}
                        max={maxApps}
                        color={
                          r.apps_implementing === 0
                            ? 'var(--ds-color-neutral-border-default)'
                            : 'var(--ds-color-accent-base-default)'
                        }
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'apps_registering',
                header: 'Registrerer',
                align: 'right',
                render: (r) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.apps_registering.toLocaleString('no-NO')}
                  </span>
                ),
              },
              {
                key: 'apps_injecting',
                header: 'Injiserer',
                align: 'right',
                render: (r) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.apps_injecting.toLocaleString('no-NO')}
                  </span>
                ),
              },
              {
                key: 'adoption_pct',
                header: 'Andel apper',
                align: 'right',
                render: (r) => (
                  <span style={{ fontVariantNumeric: 'tabular-nums', ...(r.apps_using ? {} : subtle) }}>
                    {r.adoption_pct.toLocaleString('no-NO')} %
                  </span>
                ),
              },
            ]}
            onRowClick={(r) => setSelected(r.name)}
          />

          {(outside.data?.length ?? 0) > 0 && (
            <Card>
              <Card.Block>
                <Heading level={3} data-size='xs'>
                  Grensesnitt utenfor katalogen
                </Heading>
                <Paragraph data-size='xs' style={subtle}>
                  Apper implementerer disse, men de finnes ikke i dagens Altinn.App-bibliotek. Som
                  regel betyr det at grensesnittet er fjernet, og at appene henger igjen på en eldre
                  versjon.
                </Paragraph>
              </Card.Block>
              <Card.Block>
                <Table<OutsideCatalogRow>
                  rows={outside.data ?? []}
                  cols={[
                    {
                      key: 'interface_name',
                      header: 'Grensesnitt',
                      render: (r) => <code style={mono}>{r.interface_name}</code>,
                    },
                    { key: 'apps_implementing', header: 'Implementerer', align: 'right' },
                    { key: 'apps_using', header: 'Bruker', align: 'right' },
                    {
                      key: 'sample_file',
                      header: 'Eksempelfil',
                      render: (r) => (
                        <code style={{ ...mono, ...subtle, fontSize: '0.75rem' }}>
                          {r.sample_file}
                        </code>
                      ),
                    },
                  ]}
                  onRowClick={(r) => setSelected(r.interface_name)}
                />
              </Card.Block>
            </Card>
          )}

          {(topApps.data?.length ?? 0) > 0 && (
            <Card>
              <Card.Block>
                <Heading level={3} data-size='xs'>
                  Apper som bruker flest grensesnitt
                </Heading>
                <Paragraph data-size='xs' style={subtle}>
                  Appene som implementerer flest grensesnitt — de mest sammensatte i flåten.
                </Paragraph>
              </Card.Block>
              <Card.Block>
                <Table
                  rows={topApps.data ?? []}
                  cols={[
                    { key: 'app_id', header: 'App' },
                    { key: 'org', header: 'Org' },
                    { key: 'implemented_interface_count', header: 'Grensesnitt', align: 'right' },
                    { key: 'cs_file_count', header: 'C#-filer', align: 'right' },
                    { key: 'backend_version', header: 'Backend' },
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
                            }}
                          >
                            Åpne i Altinn Studio ↗
                          </a>
                        ) : (
                          <span style={subtle}>—</span>
                        ),
                    },
                  ]}
                />
              </Card.Block>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
