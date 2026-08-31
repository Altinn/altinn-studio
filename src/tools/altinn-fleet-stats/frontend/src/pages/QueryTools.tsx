import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CodeMirror, { type EditorView, keymap } from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import {
  Alert,
  Button,
  Card,
  Heading,
  Paragraph,
  Spinner,
  Tag,
} from '@digdir/designsystemet-react';
import { api } from '../lib/api';

type SchemaTable = {
  name: string;
  columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
  foreign_keys: Array<{ from: string; to_table: string; to_col: string }>;
  row_count: number | null;
};

type RunResult = {
  columns: string[];
  rows: any[][];
  row_count: number;
  truncated: boolean;
  duration_ms: number;
  error?: string;
};

const DEFAULT_SQL = `-- Skriv SQL mot fleet-databasen (read-only).
-- Cmd/Ctrl+Enter = kjør. Bruk skjema-panelet til venstre eller eksempel-knappen for forslag.

SELECT type AS komponent,
       COUNT(*) AS forekomster,
       COUNT(DISTINCT app_id) AS apper
FROM components
GROUP BY type
ORDER BY forekomster DESC
LIMIT 20;`;

export function QueryToolsPage() {
  const schemaQ = useQuery({ queryKey: ['query-schema'], queryFn: api.querySchema });
  const samplesQ = useQuery({ queryKey: ['query-samples'], queryFn: api.querySamples });
  const [code, setCode] = useState<string>(DEFAULT_SQL);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [showSamples, setShowSamples] = useState(false);

  // Build CodeMirror SQL schema config for autocomplete
  const schemaForCM = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const t of schemaQ.data ?? []) {
      out[t.name] = t.columns.map((c) => c.name);
    }
    return out;
  }, [schemaQ.data]);

  const runQuery = useCallback(async () => {
    if (running || !code.trim()) return;
    setRunning(true);
    try {
      const r = await api.queryRun(code);
      setResult(r);
    } catch (e: any) {
      setResult({
        columns: [],
        rows: [],
        row_count: 0,
        truncated: false,
        duration_ms: 0,
        error: e.message ?? String(e),
      });
    } finally {
      setRunning(false);
    }
  }, [code, running]);

  // Cmd/Ctrl+Enter shortcut at the document level too — works even if editor isn't focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runQuery();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [runQuery]);

  const extensions = useMemo(() => {
    return [
      sql({ dialect: SQLite, schema: schemaForCM, upperCaseKeywords: true }),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: (_view: EditorView) => {
              runQuery();
              return true;
            },
          },
        ]),
      ),
    ];
  }, [schemaForCM, runQuery]);

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const browseTable = useCallback(async (name: string) => {
    // pgAdmin-stil: klikk tabellnavn → SELECT * FROM tabell LIMIT 100, og kjør
    const query = `SELECT * FROM ${name} LIMIT 100;`;
    setCode(query);
    setExpandedTables((prev) => new Set(prev).add(name));
    setRunning(true);
    try {
      const r = await api.queryRun(query, 100);
      setResult(r);
    } catch (e: any) {
      setResult({
        columns: [],
        rows: [],
        row_count: 0,
        truncated: false,
        duration_ms: 0,
        error: e.message ?? String(e),
      });
    } finally {
      setRunning(false);
    }
  }, []);

  const insertSnippet = (snippet: string) => {
    setCode((c) => (c.trim() ? c + '\n\n' + snippet : snippet));
    setShowSamples(false);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-baseline gap-3'>
        <Heading level={2} data-size='sm'>
          Query Tools
        </Heading>
        <Tag data-color='info'>Read-only SQL</Tag>
      </div>
      <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
        Skriv egne SQL-spørringer mot fleet-databasen. SQLite-syntaks. Skjema-panelet til venstre
        gir autocomplete på tabeller og kolonner mens du skriver. Hint: <code>Cmd/Ctrl+Enter</code>{' '}
        kjører.
      </Paragraph>

      <div className='grid grid-cols-12 gap-4'>
        {/* Schema sidebar */}
        <div className='col-span-12 md:col-span-3'>
          <Card>
            <Card.Block>
              <Heading level={3} data-size='2xs'>
                Skjema
              </Heading>
              <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                Klikk en tabell for å se kolonner.
              </Paragraph>
            </Card.Block>
            <Card.Block>
              {schemaQ.isLoading && <Spinner aria-label='Laster' data-size='sm' />}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(schemaQ.data ?? []).map((t) => (
                  <li key={t.name} style={{ borderRadius: 4 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.15rem 0',
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--ds-color-neutral-surface-hover)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* Chevron: toggle column list only */}
                      <button
                        type='button'
                        onClick={() => toggleTable(t.name)}
                        aria-label={expandedTables.has(t.name) ? 'Skjul kolonner' : 'Vis kolonner'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.15rem 0.25rem',
                          color: 'var(--ds-color-neutral-text-subtle)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {expandedTables.has(t.name) ? '▾' : '▸'}
                      </button>
                      {/* Table name: browse data (SELECT * LIMIT 100) */}
                      <button
                        type='button'
                        onClick={() => browseTable(t.name)}
                        title={`Vis 100 første rader fra ${t.name}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.2rem 0.25rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.8125rem',
                          color: 'var(--ds-color-neutral-text-default)',
                          textAlign: 'left',
                        }}
                      >
                        <span>{t.name}</span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--ds-color-neutral-text-subtle)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {t.row_count?.toLocaleString('no-NO') ?? '—'}
                        </span>
                      </button>
                    </div>
                    {expandedTables.has(t.name) && (
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: '0.25rem 0 0.5rem 1.5rem',
                          margin: 0,
                          fontSize: '0.75rem',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {t.columns.map((c) => (
                          <li
                            key={c.name}
                            onClick={() => {
                              navigator.clipboard?.writeText(`${t.name}.${c.name}`).catch(() => {});
                            }}
                            title='Klikk for å kopiere'
                            style={{
                              padding: '0.15rem 0',
                              cursor: 'pointer',
                              color: 'var(--ds-color-neutral-text-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                            }}
                          >
                            <span>
                              {c.pk && (
                                <span style={{ color: 'var(--ds-color-accent-text-default)' }}>
                                  🔑{' '}
                                </span>
                              )}
                              {c.name}
                            </span>
                            <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>{c.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Card.Block>
          </Card>
        </div>

        {/* Editor + results */}
        <div className='col-span-12 md:col-span-9 space-y-3'>
          <Card>
            <Card.Block style={{ padding: 0 }}>
              <div
                style={{
                  borderRadius: '0.375rem',
                  border: '1px solid var(--ds-color-neutral-border-subtle)',
                  overflow: 'hidden',
                }}
              >
                <CodeMirror
                  value={code}
                  height='260px'
                  extensions={extensions}
                  onChange={(v) => setCode(v)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                  }}
                />
              </div>
            </Card.Block>
            <Card.Block>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  data-color='accent'
                  variant='primary'
                  data-size='sm'
                  onClick={runQuery}
                  disabled={running}
                >
                  {running && <Spinner aria-label='Kjører' data-size='sm' />}
                  {running ? 'Kjører…' : 'Kjør (⌘+Enter)'}
                </Button>
                <Button
                  variant='secondary'
                  data-size='sm'
                  onClick={() => setShowSamples(!showSamples)}
                >
                  {showSamples ? 'Skjul' : 'Eksempler'}
                </Button>
                <Button
                  variant='tertiary'
                  data-size='sm'
                  onClick={() => {
                    setCode('');
                    setResult(null);
                  }}
                >
                  Tøm
                </Button>
                <span style={{ flex: 1 }} />
                {result && !result.error && (
                  <Tag data-color='success'>
                    {result.row_count} {result.truncated ? '+ rader' : 'rader'} ·{' '}
                    {result.duration_ms}ms
                  </Tag>
                )}
                {result?.error && <Tag data-color='danger'>Feil</Tag>}
              </div>
              {showSamples && (
                <div className='mt-3 space-y-1'>
                  {(samplesQ.data ?? []).map((s) => (
                    <button
                      key={s.title}
                      type='button'
                      onClick={() => insertSnippet(s.sql)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--ds-color-neutral-surface-tinted)',
                        border: '1px solid var(--ds-color-neutral-border-subtle)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--ds-color-neutral-surface-hover)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          'var(--ds-color-neutral-surface-tinted)')
                      }
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </Card.Block>
          </Card>

          {/* Results */}
          {result?.error && (
            <Alert data-color='danger'>
              <Paragraph
                data-size='sm'
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}
              >
                {result.error}
              </Paragraph>
            </Alert>
          )}

          {result && !result.error && (
            <Card>
              <Card.Block>
                <div className='flex items-baseline gap-2'>
                  <Heading level={3} data-size='2xs'>
                    Resultat
                  </Heading>
                  {result.truncated && (
                    <Tag data-color='warning'>Trunkert til {result.row_count} rader</Tag>
                  )}
                  <span style={{ flex: 1 }} />
                  <Button variant='tertiary' data-size='sm' onClick={() => exportCsv(result)}>
                    Eksporter CSV
                  </Button>
                </div>
              </Card.Block>
              <Card.Block style={{ padding: 0, maxHeight: '60vh', overflow: 'auto' }}>
                <ResultTable result={result} />
              </Card.Block>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultTable({ result }: { result: RunResult }) {
  if (result.row_count === 0) {
    return (
      <Paragraph
        data-size='sm'
        style={{
          padding: '1rem',
          color: 'var(--ds-color-neutral-text-subtle)',
          textAlign: 'center',
        }}
      >
        Spørringen returnerte ingen rader.
      </Paragraph>
    );
  }
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8125rem',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <thead
        style={{
          position: 'sticky',
          top: 0,
          background: 'var(--ds-color-neutral-surface-tinted)',
          zIndex: 1,
        }}
      >
        <tr>
          {result.columns.map((c, i) => (
            <th
              key={i}
              style={{
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                borderBottom: '1px solid var(--ds-color-neutral-border-default)',
                fontWeight: 600,
              }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, r) => (
          <tr
            key={r}
            style={{
              background: r % 2 ? 'var(--ds-color-neutral-surface-tinted)' : 'transparent',
            }}
          >
            {row.map((v, c) => (
              <td
                key={c}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                  whiteSpace: 'nowrap',
                  maxWidth: '30rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={v == null ? 'NULL' : String(v)}
              >
                {v == null ? (
                  <span
                    style={{ color: 'var(--ds-color-neutral-text-subtle)', fontStyle: 'italic' }}
                  >
                    NULL
                  </span>
                ) : (
                  String(v)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function exportCsv(result: RunResult) {
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    result.columns.map(esc).join(','),
    ...result.rows.map((r) => r.map(esc).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fleet-query-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
