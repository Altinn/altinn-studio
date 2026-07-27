import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from './Table';
import { StatBlock } from './StatBlock';

const KIND_LABEL: Record<string, string> = {
  literal: 'Literal verdi',
  object: 'Objekt',
  array: 'Array',
  expression: 'Expression',
  null: 'Null',
};

export function SettingsKeyDetail({
  scope,
  keyPath,
  onBack,
}: {
  scope: string;
  keyPath: string;
  onBack: () => void;
}) {
  const q = useQuery({
    queryKey: ['settings-key', scope, keyPath],
    queryFn: () => api.settingsKeyDetail(scope, keyPath),
  });

  if (q.isLoading) return <Paragraph>Laster…</Paragraph>;
  if (q.isError)
    return <Alert data-color='danger'>Klarte ikke laste detaljer: {String(q.error)}</Alert>;
  if (!q.data) return null;

  const d = q.data;

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Button variant='tertiary' data-size='sm' onClick={onBack}>
          ← Tilbake til oversikt
        </Button>
      </div>

      <div className='space-y-2'>
        <div className='flex items-baseline gap-3 flex-wrap'>
          <Heading level={2} data-size='lg' style={{ fontFamily: 'ui-monospace, monospace' }}>
            {d.key_path}
          </Heading>
          <Tag data-color='info'>
            {scope === 'layout_set' ? 'Settings.json' : 'applicationmetadata.json'}
          </Tag>
        </div>
        {d.description ? (
          <Card>
            <Card.Block>
              <Paragraph
                data-size='xs'
                style={{ color: 'var(--ds-color-neutral-text-subtle)', marginBottom: '0.25rem' }}
              >
                Fra Altinn JSON-schema
              </Paragraph>
              <Paragraph>{d.description}</Paragraph>
            </Card.Block>
          </Card>
        ) : (
          <Alert data-color='warning'>
            <Paragraph data-size='sm'>
              Ingen offisiell beskrivelse funnet for denne nøkkelen. Mulige årsaker: egen-definert
              nøkkel, eller schemaet er ikke synkronisert med faktisk bruk.
            </Paragraph>
          </Alert>
        )}
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-3 gap-3'>
        <StatBlock
          label='Apper som bruker'
          value={`${d.apps}`}
          hint={`${d.coverage_pct}% av ${d.total_apps_in_fleet}`}
        />
        <StatBlock
          label='Totalt antall forekomster'
          value={d.total_uses.toLocaleString('no-NO')}
          hint='kan være flere per app (f.eks. per layout-set)'
        />
        <StatBlock label='Verdi-typer' value={(d.value_kinds || []).join(', ') || '—'} />
      </div>

      <Card>
        <Card.Block>
          <Heading level={3} data-size='xs'>
            Hvilke verdi-typer brukes?
          </Heading>
          <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Apper sortert etter hvordan de fyller ut nøkkelen.
          </Paragraph>
        </Card.Block>
        <Card.Block>
          <Table
            rows={d.by_kind}
            cols={[
              {
                key: 'value_kind',
                header: 'Type',
                render: (r) => KIND_LABEL[r.value_kind] || r.value_kind,
              },
              { key: 'apps', header: 'Apper', align: 'right' },
            ]}
          />
        </Card.Block>
      </Card>

      <Card>
        <Card.Block>
          <Heading level={3} data-size='xs'>
            Apper som bruker
          </Heading>
          <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Viser opptil 200 apper.
          </Paragraph>
        </Card.Block>
        <Card.Block>
          <Table
            rows={d.apps_using}
            cols={[
              { key: 'app_id', header: 'App' },
              { key: 'org', header: 'Org' },
              { key: 'backend_version', header: 'Backend' },
            ]}
          />
        </Card.Block>
      </Card>
    </div>
  );
}
