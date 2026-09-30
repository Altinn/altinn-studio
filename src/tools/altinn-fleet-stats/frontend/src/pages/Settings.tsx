import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Field, Heading, Label, Paragraph, Select, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from '../components/Table';
import { MiniBar } from '../components/Bar';
import { SettingsKeyDetail } from '../components/SettingsKeyDetail';

type Scope = 'layout_set' | 'application_metadata';

const SCOPE_LABEL: Record<Scope, string> = {
  layout_set: 'Settings.json (layout-set)',
  application_metadata: 'applicationmetadata.json',
};

export function SettingsPage() {
  const [scope, setScope] = useState<Scope>('layout_set');
  const [drillKey, setDrillKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ['settings-keys', scope],
    queryFn: () => api.settingsKeys(scope, 300),
  });

  if (drillKey) {
    return <SettingsKeyDetail scope={scope} keyPath={drillKey} onBack={() => setDrillKey(null)} />;
  }

  const totalApps =
    keys.data && keys.data.length > 0 ? Math.max(...keys.data.map((r) => r.apps)) : 1;
  const documented = (keys.data ?? []).filter((r) => !!r.description).length;
  const undocumented = (keys.data ?? []).length - documented;

  return (
    <div className='space-y-4'>
      <div>
        <Heading level={2} data-size='sm'>
          Innstillingsnøkler
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Hvilke konfigurasjonsnøkler appene faktisk bruker, og hva de betyr (fra Altinn sitt
          offisielle JSON-schema). Klikk en rad for detaljer.
        </Paragraph>
      </div>

      <div className='flex items-end gap-3 flex-wrap'>
        <Field>
          <Label>Scope</Label>
          <Select
            value={scope}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setScope(e.target.value as Scope)
            }
          >
            <Select.Option value='layout_set'>Settings.json (layout-set)</Select.Option>
            <Select.Option value='application_metadata'>applicationmetadata.json</Select.Option>
          </Select>
        </Field>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', marginBottom: '0.5rem' }}>
          <Tag data-color='success'>Dokumentert: {documented}</Tag>
          {undocumented > 0 && <Tag data-color='warning'>Mangler beskrivelse: {undocumented}</Tag>}
        </div>
      </div>

      {undocumented > 0 && documented > 0 && (
        <Alert data-color='info'>
          <Paragraph data-size='sm'>
            Nøkler uten beskrivelse er typisk egen-definerte felt, eller felt som ikke finnes i det
            offisielle schemaet for <code>{SCOPE_LABEL[scope]}</code>. Disse vises uten
            beskrivelse-tekst.
          </Paragraph>
        </Alert>
      )}

      <Table
        rows={keys.data ?? []}
        cols={[
          {
            key: 'key_path',
            header: 'Nøkkel',
            render: (r) => (
              <div>
                <code
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  {r.key_path}
                </code>
                {r.description && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--ds-color-neutral-text-subtle)',
                      marginTop: '0.125rem',
                      maxWidth: '600px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={r.description}
                  >
                    {r.description}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'value_kinds',
            header: 'Typer',
            render: (r) => (
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {r.value_kinds.slice(0, 3).map((k) => (
                  <Tag
                    key={k}
                    data-color='neutral'
                    data-size='sm'
                    style={{ fontSize: '0.6875rem' }}
                  >
                    {k}
                  </Tag>
                ))}
              </div>
            ),
          },
          {
            key: 'apps',
            header: 'Apper',
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
                  style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}
                >
                  {r.apps}
                </span>
                <div style={{ width: 80 }}>
                  <MiniBar value={r.apps} max={totalApps} />
                </div>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.75rem',
                    color: 'var(--ds-color-neutral-text-subtle)',
                    minWidth: 50,
                    textAlign: 'right',
                  }}
                >
                  {r.coverage_pct}%
                </span>
              </div>
            ),
          },
        ]}
        onRowClick={(r) => setDrillKey(r.key_path)}
      />
    </div>
  );
}
