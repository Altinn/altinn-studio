import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Button, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api, type InterfaceAppRow } from '../lib/api';
import { Table } from './Table';
import { MiniBar } from './Bar';
import { StatBlock } from './StatBlock';

const GITHUB_BLOB = 'https://github.com/Altinn/altinn-studio/blob/main/';

const KIND_LABEL: Record<string, string> = {
  implements: 'Implementerer',
  registers: 'Registrerer',
  injects: 'Injiserer',
};

const KIND_COLOR: Record<string, 'success' | 'info' | 'neutral'> = {
  implements: 'success',
  registers: 'info',
  injects: 'neutral',
};

const mono = { fontFamily: 'ui-monospace, monospace' };
const subtle = { color: 'var(--ds-color-neutral-text-subtle)' };

export function InterfaceDetail({
  name,
  onBack,
  onPick,
}: {
  name: string;
  onBack: () => void;
  onPick?: (name: string) => void;
}) {
  const q = useQuery({
    queryKey: ['interface-detail', name],
    queryFn: () => api.interfaceDetail(name),
  });

  if (q.isLoading) return <Paragraph>Laster…</Paragraph>;
  if (q.isError)
    return <Alert data-color='danger'>Klarte ikke laste detaljer: {String(q.error)}</Alert>;
  if (!q.data) return null;

  const d = q.data;
  const c = d.catalog ?? {};
  const maxOrg = d.by_org[0]?.apps ?? 1;
  const maxTogether = d.used_together_with[0]?.apps ?? 1;

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Button variant='tertiary' data-size='sm' onClick={onBack}>
          ← Tilbake til alle grensesnitt
        </Button>
      </div>

      <div className='space-y-2'>
        <div className='flex items-baseline gap-3 flex-wrap'>
          <Heading level={2} data-size='lg' style={mono}>
            {d.name}
          </Heading>
          {c.implementable_by_apps && <Tag data-color='success'>Utvidelsespunkt</Tag>}
          {c.area === 'Internal' && <Tag data-color='neutral'>Intern</Tag>}
          {c.is_obsolete && <Tag data-color='warning'>Utdatert</Tag>}
          {!d.in_catalog && <Tag data-color='danger'>Ikke i katalogen</Tag>}
        </div>
        {c.namespace && (
          <Paragraph data-size='xs' style={{ ...mono, ...subtle }}>
            {c.namespace} · {c.assembly}
          </Paragraph>
        )}
        {c.summary && <Paragraph data-size='sm'>{c.summary}</Paragraph>}
        {c.is_obsolete && c.obsolete_message && (
          <Alert data-color='warning'>
            <strong>Utdatert:</strong> {c.obsolete_message}
          </Alert>
        )}
        {!d.in_catalog && (
          <Alert data-color='info'>
            Dette grensesnittet finnes ikke i den versjonen av Altinn.App-biblioteket katalogen er
            bygget fra. Appene under bruker altså noe som er fjernet, eller noe som kommer fra et
            annet bibliotek.
          </Alert>
        )}
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatBlock
          label='Apper som implementerer'
          value={d.apps_implementing.toLocaleString('no-NO')}
          hint={`${d.total_apps > 0 ? Math.round((d.apps_implementing / d.total_apps) * 100) : 0} % av ${d.total_apps.toLocaleString('no-NO')} apper`}
          accent={d.apps_implementing > 0 ? 'success' : 'default'}
        />
        <StatBlock
          label='Registrerer i Program.cs'
          value={d.apps_registering.toLocaleString('no-NO')}
          hint='DI-registrering funnet i koden'
        />
        <StatBlock
          label='Injiserer / bruker typen'
          value={d.apps_injecting.toLocaleString('no-NO')}
          hint='Brukt som type uten å implementeres'
        />
        <StatBlock
          label='Implementasjoner totalt'
          value={d.implementations.toLocaleString('no-NO')}
          hint='Klasser på tvers av flåten'
        />
      </div>

      {(c.members?.length ?? 0) > 0 && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size='xs'>
              Signatur
            </Heading>
            <Paragraph data-size='xs' style={subtle}>
              Medlemmene en app må implementere.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <pre
              style={{
                ...mono,
                fontSize: '0.8125rem',
                margin: 0,
                padding: '0.75rem',
                overflowX: 'auto',
                background: 'var(--ds-color-neutral-surface-tinted)',
                borderRadius: 4,
              }}
            >
              {`public interface ${d.name}${
                (c.base_interfaces?.length ?? 0) > 0 ? ` : ${c.base_interfaces?.join(', ')}` : ''
              }\n{\n${(c.members ?? []).map((m) => `    ${m}`).join('\n')}\n}`}
            </pre>
            {c.source_path && (
              <Paragraph data-size='xs' style={{ marginTop: '0.5rem' }}>
                <a
                  href={`${GITHUB_BLOB}${c.source_path}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{ color: 'var(--ds-color-accent-text-default)' }}
                >
                  {c.source_path} ↗
                </a>
              </Paragraph>
            )}
          </Card.Block>
        </Card>
      )}

      <div className='grid lg:grid-cols-2 gap-4'>
        {d.used_together_with.length > 0 && (
          <Card>
            <Card.Block>
              <Heading level={3} data-size='xs'>
                Brukes sammen med
              </Heading>
              <Paragraph data-size='xs' style={subtle}>
                Andre grensesnitt de samme appene implementerer — hva som henger sammen i
                praksis.
              </Paragraph>
            </Card.Block>
            <Card.Block>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {d.used_together_with.map((t) => (
                  <li
                    key={t.name}
                    onClick={onPick ? () => onPick(t.name) : undefined}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(160px, 1fr) 1fr 44px',
                      gap: '0.75rem',
                      alignItems: 'center',
                      padding: '0.35rem 0',
                      borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                      fontSize: '0.875rem',
                      cursor: onPick ? 'pointer' : undefined,
                    }}
                  >
                    <code style={mono}>{t.name}</code>
                    <MiniBar value={t.apps} max={maxTogether} />
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {t.apps}
                    </span>
                  </li>
                ))}
              </ul>
            </Card.Block>
          </Card>
        )}

        {d.by_backend.length > 0 && (
          <Card>
            <Card.Block>
              <Heading level={3} data-size='xs'>
                Backend-versjoner blant brukerne
              </Heading>
              <Paragraph data-size='xs' style={subtle}>
                Hvilke bibliotekversjoner appene som bruker grensesnittet kjører på.
              </Paragraph>
            </Card.Block>
            <Card.Block>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={d.by_backend.slice(0, 12)}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis dataKey='backend_version' tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor='end' height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} apper`, 'Apper']} />
                    <Bar dataKey='apps' fill='var(--ds-color-accent-base-default)' />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Block>
          </Card>
        )}
      </div>

      {d.by_org.length > 0 && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size='xs'>
              Fordeling per organisasjon
            </Heading>
          </Card.Block>
          <Card.Block>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {d.by_org.slice(0, 15).map((o) => (
                <li
                  key={o.org}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 200px) 1fr 44px',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.3rem 0',
                    fontSize: '0.875rem',
                  }}
                >
                  <span>{o.org}</span>
                  <MiniBar value={o.apps} max={maxOrg} />
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {o.apps}
                  </span>
                </li>
              ))}
            </ul>
          </Card.Block>
        </Card>
      )}

      <Card>
        <Card.Block>
          <Heading level={3} data-size='xs'>
            Apper som bruker {d.name}
          </Heading>
          <Paragraph data-size='xs' style={subtle}>
            {d.apps.length.toLocaleString('no-NO')} apper
            {d.apps_truncated ? ' (listen er avkortet)' : ''}. Klassenavn og filbane peker rett på
            koden i appens repo.
          </Paragraph>
        </Card.Block>
        <Card.Block>
          <Table<InterfaceAppRow>
            rows={d.apps}
            emptyTitle='Ingen apper bruker dette grensesnittet'
            emptyDescription='Ingen app i flåten implementerer, registrerer eller injiserer dette grensesnittet.'
            cols={[
              { key: 'app_id', header: 'App' },
              { key: 'org', header: 'Org' },
              {
                key: 'usage_kinds',
                header: 'Bruk',
                render: (r) => (
                  <span style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {r.usage_kinds.map((k) => (
                      <Tag key={k} data-color={KIND_COLOR[k] ?? 'neutral'} data-size='sm'>
                        {KIND_LABEL[k] ?? k}
                      </Tag>
                    ))}
                  </span>
                ),
              },
              {
                key: 'class_names',
                header: 'Klasse',
                render: (r) =>
                  r.class_names.length > 0 ? (
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <code style={{ ...mono, fontSize: '0.8125rem' }}>
                        {r.class_names.join(', ')}
                      </code>
                      {r.via.length > 0 && (
                        <span style={{ ...subtle, fontSize: '0.75rem' }}>
                          arver {r.via.join(', ')}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={subtle}>—</span>
                  ),
              },
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
                      onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
