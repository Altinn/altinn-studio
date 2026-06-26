import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from './Table';

type Kind = 'backend' | 'frontend';

type AppRow = {
  app_id: string;
  org: string;
  app_name: string;
  backend_pkg?: string;
  backend_version?: string;
  gitea_url: string;
};

export function VersionDetail({
  kind,
  version,
  onBack,
}: {
  kind: Kind;
  version: string;
  onBack: () => void;
}) {
  const q = useQuery<AppRow[]>({
    queryKey: ['version-apps', kind, version],
    queryFn: async () => {
      if (kind === 'backend') {
        return await api.appsForBackendVersion(version);
      }
      return await api.appsForFrontendVersion(version);
    },
  });

  if (q.isLoading) return <Paragraph>Laster…</Paragraph>;
  if (q.isError) return <Alert data-color='danger'>Klarte ikke laste: {String(q.error)}</Alert>;

  const rows: AppRow[] = q.data ?? [];

  return (
    <div className='space-y-5'>
      <div className='flex items-center gap-2'>
        <Button variant='tertiary' data-size='sm' onClick={onBack}>
          ← Tilbake til oversikt
        </Button>
      </div>

      <div className='flex items-baseline gap-3 flex-wrap'>
        <Heading level={2} data-size='lg' style={{ fontFamily: 'ui-monospace, monospace' }}>
          {version}
        </Heading>
        <Tag data-color='info'>{kind === 'backend' ? 'Backend-versjon' : 'Frontend-versjon'}</Tag>
        <Tag data-color='neutral'>{rows.length} apper</Tag>
      </div>

      <Card>
        <Card.Block>
          <Heading level={3} data-size='xs'>
            Apper som bruker {version}
          </Heading>
          <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Klikk «Åpne i Altinn Studio» for å gå til repo på altinn.studio.
          </Paragraph>
        </Card.Block>
        <Card.Block>
          <Table<AppRow>
            rows={rows}
            cols={[
              { key: 'app_id', header: 'App' },
              { key: 'org', header: 'Org' },
              kind === 'backend'
                ? { key: 'backend_pkg', header: 'Pakke' }
                : { key: 'backend_version', header: 'Backend' },
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
