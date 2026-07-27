import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { MiniBar } from '../components/Bar';
import { VersionDetail } from '../components/VersionDetail';
import { StatBlock } from '../components/StatBlock';
import { ListCardSkeleton, StatsRowSkeleton } from '../components/Skeletons';
import { EmptyState } from '../components/EmptyState';

type Selection = { kind: 'backend' | 'frontend'; version: string };

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export function OverviewPage() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const ov = useQuery({ queryKey: ['overview'], queryFn: api.overview });
  const backend = useQuery({ queryKey: ['backend'], queryFn: api.backend });
  const frontend = useQuery({ queryKey: ['frontend'], queryFn: api.frontend });

  if (selected) {
    return (
      <VersionDetail
        kind={selected.kind}
        version={selected.version}
        onBack={() => setSelected(null)}
      />
    );
  }

  const lastScan = ov.data?.last_scan;
  const backendCount = backend.data?.length ?? 0;
  const frontendCount = frontend.data?.length ?? 0;
  const isLoading = ov.isLoading || backend.isLoading || frontend.isLoading;
  const isEmpty = !isLoading && (ov.data?.apps ?? 0) === 0;

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <StatsRowSkeleton count={4} />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <ListCardSkeleton rows={7} />
          <ListCardSkeleton rows={7} />
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title='Ingen apper analysert ennå'
        description={
          <>
            Klikk <strong>Hent apper</strong> i panelet over for å klone, deretter{' '}
            <strong>Re-analyser</strong> for å bygge databasen. Hele jobben tar 3–8 minutter første
            gang.
          </>
        }
      />
    );
  }

  return (
    <div className='space-y-6'>
      {/* KPI-strip — alt det viktigste i én scan-able rad */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatBlock
          label='Apper analysert'
          value={(ov.data?.apps ?? 0).toLocaleString('no-NO')}
          hint={lastScan ? `Sist: ${fmtTime(lastScan.finished_at)}` : undefined}
        />
        <StatBlock label='Organisasjoner' value={ov.data?.orgs ?? '—'} />
        <StatBlock label='Backend-versjoner' value={backendCount} hint='unike versjoner i bruk' />
        <StatBlock label='Frontend-versjoner' value={frontendCount} hint='unike versjoner i bruk' />
      </div>

      {/* To kompakte distribusjons-kort side om side */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <VersionListCard
          title='Backend-versjoner'
          subtitle='Altinn.App.Api / Core fra App.csproj'
          rows={backend.data ?? []}
          onPick={(v) => setSelected({ kind: 'backend', version: v.version })}
          renderLabel={(v) => v.version}
        />
        <VersionListCard
          title='Frontend-versjoner'
          subtitle='altinn-app-frontend fra Index.cshtml'
          rows={frontend.data ?? []}
          onPick={(v) => setSelected({ kind: 'frontend', version: v.version })}
          renderLabel={(v) => v.version}
        />
      </div>

      {lastScan && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size='2xs'>
              Forrige analyse
            </Heading>
            <div
              className='mt-1 flex flex-wrap gap-3 items-center text-sm'
              style={{ color: 'var(--ds-color-neutral-text-subtle)' }}
            >
              <span>
                Ferdig:{' '}
                <strong style={{ color: 'var(--ds-color-neutral-text-default)' }}>
                  {fmtTime(lastScan.finished_at)}
                </strong>
              </span>
              <span>·</span>
              <Tag data-color='success'>Skannet: {lastScan.apps_scanned}</Tag>
              <Tag data-color='neutral'>Skippet: {lastScan.apps_skipped}</Tag>
              {lastScan.errors > 0 && <Tag data-color='warning'>Feil: {lastScan.errors}</Tag>}
            </div>
          </Card.Block>
        </Card>
      )}
    </div>
  );
}

function VersionListCard<T extends { version: string; apps: number }>({
  title,
  subtitle,
  rows,
  onPick,
  renderLabel,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  onPick: (r: T) => void;
  renderLabel: (r: T) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.apps));
  const initial = 7;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, initial);
  const hiddenCount = Math.max(0, rows.length - initial);

  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size='xs'>
          {title}
        </Heading>
        <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {subtitle}. Klikk en versjon for å se appene som bruker den.
        </Paragraph>
      </Card.Block>
      <Card.Block>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visible.map((r) => (
            <li
              key={r.version}
              onClick={() => onPick(r)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, auto) 1fr 50px',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.5rem 0.25rem',
                borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--ds-color-neutral-surface-hover)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <code style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>
                {renderLabel(r)}
              </code>
              <MiniBar value={r.apps} max={max} />
              <span
                style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
              >
                {r.apps}
              </span>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <button
            type='button'
            onClick={() => setShowAll(!showAll)}
            style={{
              marginTop: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-color-accent-text-default)',
              fontSize: '0.875rem',
              padding: '0.25rem 0',
            }}
          >
            {showAll ? 'Vis færre' : `Vis alle ${rows.length} versjoner →`}
          </button>
        )}
      </Card.Block>
    </Card>
  );
}
