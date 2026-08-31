import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Details,
  Heading,
  Paragraph,
  Spinner,
  Tag,
} from '@digdir/designsystemet-react';
import {
  api,
  getOperationStatus,
  startOperation,
  subscribeToOperation,
  type SSEEvent,
} from '../lib/api';

type Op = 'fetch' | 'scan';

const SCAN_ACTIVITIES = [
  'Beregner content-hash per app…',
  'Parser JSON-layouter…',
  'Indekser komponenter og props…',
  'Mapper textResourceBindings…',
  'Leser resource.nb.json / resource.nn.json…',
  'Traverserer BPMN-grafen…',
  'Resolver exclusive gateways…',
  'Enumererer brukerreise-paths…',
  'Henter Altinn JSON-schema for innstillinger…',
  'Detekterer custom frontend-bygg…',
  'Skriver til SQLite med transaksjon per app…',
  'Validerer app.csproj-versjoner…',
  'Telte dataModelBindings…',
  'Sjekker for døde tekstressurser…',
  'Aggregerer per organisasjon…',
  'Beregner forekomster og dekning…',
  'Sjekker fetch-failed-markører…',
];

const FETCH_ACTIVITIES = [
  'Spør kuberneteswrapper om deployments…',
  'Slår opp release-tags på altinn.studio…',
  'Sjekker remote HEAD…',
  'Kloner via git over HTTPS…',
  'Checker ut spesifikk commit…',
  'Sammenligner content-hash mot lokal versjon…',
  'Rydder fetch-failed-markører…',
];

const REASSURANCE = [
  'Dette tar litt tid, men ingenting er feil — bare mange apper å gnage på.',
  '642 apper × ~200 komponenter = mange små JSON-treer å vandre.',
  'SSE-streamen er fortsatt levende. Vi gir beskjed hvis noe ryker.',
  'Hver app går gjennom hash → JSON-parse → BPMN → SQLite — flere ganger.',
  'Bedre at det går grundig én gang enn at vi må kjøre på nytt.',
  'Force-rescan er sjelden — vanlig Re-analyser tar bare 6 sek når ingenting har endret seg.',
];

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

export function ControlPanel() {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({ queryKey: ['config'], queryFn: api.config });
  const { data: overview } = useQuery({
    queryKey: ['overview'],
    queryFn: api.overview,
    refetchInterval: 5000,
  });

  const [running, setRunning] = useState<null | Op>(null);
  const [lastMsg, setLastMsg] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [logs, setLogs] = useState<SSEEvent[]>([]);
  const [counters, setCounters] = useState({ errors: 0 });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activityIdx, setActivityIdx] = useState(0);
  const [reassuranceIdx, setReassuranceIdx] = useState(0);

  // On mount, check if an operation is already running and resume the stream
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const status = await getOperationStatus().catch(() => null);
      if (cancelled || !status) return;
      if (status.running) {
        setRunning(status.kind as Op);
        setLastMsg(status.last_message);
        setStartedAt(status.started_at ? status.started_at * 1000 : Date.now());
      }
      unsubscribe = attachStream();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed timer — ticks every second while running
  useEffect(() => {
    if (!running || !startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  // Rotating activity message — gives a sense of liveness between real events
  useEffect(() => {
    if (!running) return;
    setActivityIdx(0);
    const id = setInterval(() => {
      setActivityIdx((i) => i + 1);
    }, 3500);
    return () => clearInterval(id);
  }, [running]);

  // Reassurance message — much slower cadence, only after we've been running a bit
  useEffect(() => {
    if (!running || elapsed < 30) return;
    setReassuranceIdx((i) => Math.floor(elapsed / 25));
  }, [running, elapsed]);

  function attachStream(): () => void {
    return subscribeToOperation(
      (ev) => {
        if (
          ev.kind === 'progress' &&
          typeof ev.current === 'number' &&
          typeof ev.total === 'number'
        ) {
          setProgress({ current: ev.current, total: ev.total });
        }
        if (ev.kind === 'error' || ev.message?.includes('failed')) {
          setCounters((c) => ({ ...c, errors: c.errors + 1 }));
        }
        setLastMsg(ev.message || '');
        setLogs((prev) => [...prev.slice(-200), ev]);
        if (ev.kind === 'done' || ev.kind === 'error') {
          setRunning(null);
          setStartedAt(null);
          qc.invalidateQueries();
        }
      },
      (err) => {
        // Stream broke — try to reconnect once
        setLastMsg(`Forbindelse brutt: ${err.message}. Prøver igjen…`);
        setTimeout(() => {
          attachStream();
        }, 1500);
      },
    );
  }

  async function run(kind: Op, opts: { force?: boolean } = {}) {
    if (running) return;
    setRunning(kind);
    setLastMsg(opts.force ? 'Starter fullstendig re-analyse…' : 'Starter…');
    setLogs([]);
    setProgress(null);
    setCounters({ errors: 0 });
    setStartedAt(Date.now());
    try {
      await startOperation(kind, opts);
    } catch (err: any) {
      setLastMsg(`Feil: ${err.message ?? String(err)}`);
      setRunning(null);
      setStartedAt(null);
    }
  }

  function fmtElapsed(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  }

  const pct = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 0;
  const needsToken = cfg && !cfg.has_git_token;
  const noData = overview?.apps === 0;

  return (
    <div className='space-y-3'>
      {needsToken && (
        <Alert data-color='warning'>
          <Heading level={3} data-size='xs'>
            Token for altinn.studio mangler
          </Heading>
          <Paragraph data-size='sm'>
            Sett et Personal Access Token før du henter apper, ellers feiler git clone.{' '}
            <Link to='/config' style={{ textDecoration: 'underline', color: 'inherit' }}>
              Konfigurer her →
            </Link>
          </Paragraph>
        </Alert>
      )}

      {!needsToken && noData && !running && (
        <Alert data-color='info'>
          <Heading level={3} data-size='xs'>
            Ingen data analysert enda
          </Heading>
          <Paragraph data-size='sm'>
            Klikk «Hent apper» for å klone, deretter «Re-analyser» for å bygge databasen.
          </Paragraph>
        </Alert>
      )}

      <Card>
        <Card.Block>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='flex items-center gap-2'>
              <span style={{ color: 'var(--ds-color-neutral-text-subtle)', fontSize: '0.875rem' }}>
                Miljø
              </span>
              <Tag data-color={cfg?.env === 'prod' ? 'warning' : 'info'}>{cfg?.env ?? '—'}</Tag>
            </div>

            <span
              aria-hidden
              style={{
                width: 1,
                height: '1.5rem',
                background: 'var(--ds-color-neutral-border-subtle)',
              }}
            />

            <div className='flex items-center gap-2'>
              <span style={{ color: 'var(--ds-color-neutral-text-subtle)', fontSize: '0.875rem' }}>
                Apper
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {overview?.apps ?? '—'}
              </strong>
            </div>

            <div className='flex items-center gap-2'>
              <span style={{ color: 'var(--ds-color-neutral-text-subtle)', fontSize: '0.875rem' }}>
                Organisasjoner
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {overview?.orgs ?? '—'}
              </strong>
            </div>

            {overview?.last_scan?.finished_at && (
              <div className='flex items-center gap-2'>
                <span
                  style={{ color: 'var(--ds-color-neutral-text-subtle)', fontSize: '0.875rem' }}
                >
                  Siste analyse
                </span>
                <span style={{ fontSize: '0.875rem' }}>
                  {fmtTime(overview.last_scan.finished_at)}
                </span>
              </div>
            )}

            <div className='ml-auto flex gap-2'>
              <Button
                onClick={() => run('fetch')}
                disabled={!!running}
                data-color='accent'
                variant='primary'
                data-size='sm'
              >
                {running === 'fetch' && <Spinner aria-label='Henter' data-size='sm' />}
                {running === 'fetch' ? 'Henter…' : 'Hent apper'}
              </Button>
              <Button
                onClick={(e) => run('scan', { force: e.shiftKey })}
                disabled={!!running}
                data-color='success'
                variant='primary'
                data-size='sm'
                title='Hold Shift for fullstendig re-analyse av alle apper'
              >
                {running === 'scan' && <Spinner aria-label='Analyserer' data-size='sm' />}
                {running === 'scan' ? 'Analyserer…' : 'Re-analyser'}
              </Button>
              <Button
                onClick={() => run('scan', { force: true })}
                disabled={!!running}
                data-color='success'
                variant='secondary'
                data-size='sm'
                title='Fullstendig re-analyse av alle apper (kan ta noen minutter)'
              >
                Force
              </Button>
            </div>
          </div>
        </Card.Block>

        {(progress || lastMsg || running) && (
          <Card.Block>
            {running && (
              <div className='mb-3'>
                <div className='mb-1 flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <Spinner aria-label='Pågår' data-size='xs' />
                    <span style={{ fontWeight: 500 }}>
                      {running === 'fetch' ? 'Henter apper' : 'Analyserer apper'}
                    </span>
                    {!progress && (
                      <span style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                        — initialiserer…
                      </span>
                    )}
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {progress
                      ? `${progress.current} / ${progress.total} (${pct}%)`
                      : 'venter på første event'}
                    {' · '}
                    <span style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {fmtElapsed(elapsed)}
                    </span>
                  </span>
                </div>
                <div
                  role='progressbar'
                  aria-valuenow={progress ? pct : undefined}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className='h-2 overflow-hidden rounded-full'
                  style={{
                    background: 'var(--ds-color-neutral-surface-tinted)',
                    position: 'relative',
                  }}
                >
                  {progress ? (
                    <div
                      className='h-full transition-all'
                      style={{
                        width: `${pct}%`,
                        background: 'var(--ds-color-accent-base-default)',
                      }}
                    />
                  ) : (
                    // Indeterminate animated bar while we wait for first progress event
                    <div
                      className='h-full'
                      style={{
                        width: '30%',
                        background: 'var(--ds-color-accent-base-default)',
                        position: 'absolute',
                        animation: 'fleet-indeterminate 1.4s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
                {counters.errors > 0 && (
                  <Paragraph
                    data-size='xs'
                    style={{
                      color: 'var(--ds-color-warning-text-default)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {counters.errors} hendelser med feil så langt
                  </Paragraph>
                )}
                {elapsed > 20 &&
                  running === 'scan' &&
                  (!progress || progress.current < progress.total * 0.1) && (
                    <Paragraph
                      data-size='xs'
                      style={{
                        color: 'var(--ds-color-neutral-text-subtle)',
                        marginTop: '0.25rem',
                      }}
                    >
                      Full re-analyse kan ta 4–10 minutter ved første kjøring eller etter
                      skjemaoppgradering.
                    </Paragraph>
                  )}

                {/* Rotating activity vibe — keeps the panel feeling alive when SSE
                    events are bursty or quiet for a few seconds */}
                {(() => {
                  const pool = running === 'scan' ? SCAN_ACTIVITIES : FETCH_ACTIVITIES;
                  const activity = pool[activityIdx % pool.length];
                  return (
                    <div
                      key={activityIdx}
                      style={{
                        marginTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--ds-color-neutral-text-subtle)',
                        animation: 'fleet-fade-in 0.6s ease-out',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--ds-color-accent-base-default)',
                          animation: 'fleet-pulse 1.4s ease-in-out infinite',
                          flexShrink: 0,
                        }}
                      />
                      <span>{activity}</span>
                    </div>
                  );
                })()}

                {elapsed >= 30 && (
                  <div
                    key={`reassure-${reassuranceIdx}`}
                    style={{
                      marginTop: '0.4rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 6,
                      background: 'var(--ds-color-info-surface-tinted)',
                      color: 'var(--ds-color-info-text-default)',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                      animation: 'fleet-fade-in 0.6s ease-out',
                    }}
                  >
                    💡 {REASSURANCE[reassuranceIdx % REASSURANCE.length]}
                  </div>
                )}
              </div>
            )}

            {progress && !running && (
              <div className='mb-3'>
                <div className='mb-1 flex items-center justify-between text-xs'>
                  <span style={{ color: 'var(--ds-color-success-text-default)', fontWeight: 500 }}>
                    Ferdig
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {progress.current} / {progress.total} (100%)
                  </span>
                </div>
                <div
                  className='h-2 overflow-hidden rounded-full'
                  style={{ background: 'var(--ds-color-neutral-surface-tinted)' }}
                >
                  <div
                    className='h-full'
                    style={{
                      width: '100%',
                      background: 'var(--ds-color-success-base-default)',
                    }}
                  />
                </div>
              </div>
            )}

            {lastMsg && (
              <Paragraph
                data-size='sm'
                style={{
                  color: 'var(--ds-color-neutral-text-subtle)',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.75rem',
                }}
              >
                {lastMsg}
              </Paragraph>
            )}

            {logs.length > 0 && (
              <Details data-size='sm' style={{ marginTop: '0.5rem' }}>
                <Details.Summary>Detaljert logg ({logs.length})</Details.Summary>
                <Details.Content>
                  <ul
                    className='max-h-72 overflow-auto rounded p-2'
                    style={{
                      background: 'var(--ds-color-neutral-surface-tinted)',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '11px',
                      listStyle: 'none',
                    }}
                  >
                    {logs.map((l, i) => (
                      <li
                        key={i}
                        style={{
                          color:
                            l.kind === 'error' || l.message?.includes('failed')
                              ? 'var(--ds-color-danger-text-default)'
                              : l.message?.includes('skipped')
                                ? 'var(--ds-color-neutral-text-subtle)'
                                : 'var(--ds-color-success-text-default)',
                          padding: '1px 0',
                        }}
                      >
                        {l.message}
                      </li>
                    ))}
                  </ul>
                </Details.Content>
              </Details>
            )}
          </Card.Block>
        )}
      </Card>
    </div>
  );
}
