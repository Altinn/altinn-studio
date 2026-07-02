import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from '../components/Table';
import { MiniBar } from '../components/Bar';
import { ComponentDetail } from '../components/ComponentDetail';
import { EmptyState } from '../components/EmptyState';

export function ComponentsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const top = useQuery({ queryKey: ['components-top'], queryFn: () => api.componentsTop(200) });

  if (selected) {
    return <ComponentDetail type={selected} onBack={() => setSelected(null)} />;
  }

  const maxOcc = top.data?.[0]?.occurrences ?? 1;
  const isEmpty = !top.isLoading && (top.data?.length ?? 0) === 0;

  return (
    <div className='space-y-4'>
      <div>
        <Heading level={2} data-size='sm'>
          Komponenter
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {top.isLoading
            ? 'Laster…'
            : `${(top.data?.length ?? 0).toLocaleString('no-NO')} typer i bruk.`}{' '}
          Klikk en rad for dyptgående statistikk om hvordan komponenten brukes og konfigureres.
        </Paragraph>
      </div>
      {isEmpty ? (
        <EmptyState
          title='Ingen komponenter analysert ennå'
          description='Kjør Re-analyser på Oversikt for å bygge databasen, så vises alle komponenttyper på tvers av appene her.'
        />
      ) : (
        <Table
          loading={top.isLoading}
          rows={top.data ?? []}
          cols={[
            { key: 'type', header: 'Type' },
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
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  >
                    {r.occurrences.toLocaleString('no-NO')}
                  </span>
                  <div style={{ width: 120 }}>
                    <MiniBar value={r.occurrences} max={maxOcc} />
                  </div>
                </div>
              ),
            },
            {
              key: 'apps_using',
              header: 'Apper',
              align: 'right',
              render: (r) => (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.apps_using.toLocaleString('no-NO')}
                </span>
              ),
            },
          ]}
          onRowClick={(r) => setSelected(r.type)}
        />
      )}
    </div>
  );
}
