import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  Heading,
  Label,
  Paragraph,
  Select,
  Tag,
  Textfield,
} from '@digdir/designsystemet-react';
import { api, giteaApi } from '../lib/api';

type SecretField = { set: boolean; preview: string };
type SettingsResponse = {
  values: {
    env: 'prod' | 'tt02';
    git_username: string;
    git_token: SecretField;
    dev_git_username: string;
    dev_git_token: SecretField;
    fetch_concurrency: number;
    scan_concurrency: number;
    source_kind: 'env' | 'gitea';
    source_owners: string[];
    allow_gitea_write: boolean;
  };
  overlay_file: string;
  overlay_fields_set: string[];
};

async function fetchSettings(): Promise<SettingsResponse> {
  const r = await fetch('/api/settings');
  if (!r.ok) throw new Error(`GET /api/settings -> ${r.status}`);
  return r.json();
}

async function postSettings(payload: Record<string, unknown>): Promise<SettingsResponse> {
  const r = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`POST /api/settings -> ${r.status}: ${txt}`);
  }
  return r.json();
}

export function SettingsConfigPage() {
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ['app-settings'], queryFn: fetchSettings });
  const snapshot = useQuery({
    queryKey: ['fleet-snapshot'],
    queryFn: api.fleetSnapshot,
    refetchInterval: 10_000,
  });

  const [env, setEnv] = useState<'prod' | 'tt02'>('prod');
  const [gitUser, setGitUser] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [showGitToken, setShowGitToken] = useState(false);
  const [devGitUser, setDevGitUser] = useState('');
  const [devGitToken, setDevGitToken] = useState('');
  const [showDevToken, setShowDevToken] = useState(false);
  const [fetchConc, setFetchConc] = useState(8);
  const [scanConc, setScanConc] = useState(8);
  const [allowWrite, setAllowWrite] = useState(false);
  const [srcKind, setSrcKind] = useState<'env' | 'gitea'>('env');
  const [owners, setOwners] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState('');

  // The token drives this: organisations come from read:organization, the
  // signed-in account from read:user. Fetched once the token is saved.
  const ownersQ = useQuery({
    queryKey: ['gitea-owners'],
    queryFn: giteaApi.owners,
    enabled: srcKind === 'gitea',
  });
  const preview = useQuery({
    queryKey: ['gitea-preview', owners],
    queryFn: () => giteaApi.ownerPreview(owners),
    enabled: srcKind === 'gitea' && owners.length > 0,
  });

  // One flat list: the signed-in account first, then organisations. Built
  // outside the markup so no conditional ever renders an empty child.
  const ownerOptions = [
    ...(ownersQ.data?.user
      ? [{ login: ownersQ.data.user.login, note: 'mine egne apper' }]
      : []),
    ...(ownersQ.data?.organisations ?? []).map((o) => ({
      login: o.login,
      note: o.full_name,
    })),
  ].filter((o) =>
    o.login.toLowerCase().includes(ownerFilter.trim().toLowerCase()),
  );

  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<null | 'altinn' | 'dev_altinn'>(null);
  const [testResult, setTestResult] = useState<null | {
    target: 'altinn' | 'dev_altinn';
    ok: boolean;
    message: string;
    gitea_version?: string;
  }>(null);

  useEffect(() => {
    if (!q.data) return;
    setEnv(q.data.values.env);
    setGitUser(q.data.values.git_username);
    setDevGitUser(q.data.values.dev_git_username);
    setFetchConc(q.data.values.fetch_concurrency);
    setScanConc(q.data.values.scan_concurrency);
    setAllowWrite(Boolean(q.data.values.allow_gitea_write));
    setSrcKind(q.data.values.source_kind ?? 'env');
    setOwners(q.data.values.source_owners ?? []);
  }, [q.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload: Record<string, unknown> = {
        env,
        git_username: gitUser,
        dev_git_username: devGitUser,
        fetch_concurrency: fetchConc,
        scan_concurrency: scanConc,
        allow_gitea_write: allowWrite,
        source_kind: srcKind,
        source_owners: owners,
      };
      if (gitToken !== '') payload.git_token = gitToken;
      if (devGitToken !== '') payload.dev_git_token = devGitToken;
      await postSettings(payload);
      setStatus({ ok: true, msg: 'Lagret. Endringer trer i kraft ved neste Hent/Re-analyser.' });
      setGitToken('');
      setDevGitToken('');
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      qc.invalidateQueries({ queryKey: ['config'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message ?? String(err) });
    } finally {
      setSaving(false);
    }
  }

  async function clearToken(field: 'git_token' | 'dev_git_token') {
    if (!confirm('Slett dette tokenet fra serveren?')) return;
    setSaving(true);
    setStatus(null);
    try {
      await postSettings({ [field]: '' });
      setStatus({ ok: true, msg: 'Token slettet.' });
      qc.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message ?? String(err) });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(target: 'altinn' | 'dev_altinn') {
    setTesting(target);
    setTestResult(null);
    try {
      const body: any = { target };
      if (target === 'altinn') {
        if (gitUser) body.git_username = gitUser;
        if (gitToken) body.git_token = gitToken;
      } else {
        if (devGitUser) body.dev_git_username = devGitUser;
        if (devGitToken) body.dev_git_token = devGitToken;
      }
      const r = await api.testConnection(body);
      setTestResult({
        target,
        ok: r.ok,
        message: r.message,
        gitea_version: r.gitea_version,
      });
    } catch (err: any) {
      setTestResult({ target, ok: false, message: err.message ?? String(err) });
    } finally {
      setTesting(null);
    }
  }

  if (q.isLoading) return <Paragraph>Laster konfigurasjon…</Paragraph>;
  if (q.isError)
    return (
      <Alert data-color='danger'>
        <Paragraph>Feil ved lasting: {String(q.error)}</Paragraph>
      </Alert>
    );

  const gitTokenInfo = q.data?.values.git_token;
  const devTokenInfo = q.data?.values.dev_git_token;

  return (
    <form onSubmit={save} className='grid grid-cols-12 gap-6'>
      {/* Venstre kolonne — innstillinger */}
      <div className='col-span-12 lg:col-span-8 space-y-4'>
        {/* Miljø */}
        <Card>
          <Card.Block>
            <div className='flex items-baseline gap-2'>
              <Heading level={2} data-size='xs'>
                Miljø
              </Heading>
              <Tag data-color={env === 'prod' ? 'warning' : 'info'}>{env}</Tag>
            </div>
            <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Hvilket Altinn-miljø vi henter fra. Hver miljø har sin egen datamappe og database.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <div className='space-y-3'>
              <Field>
                <Label>Hvor skal appene hentes fra?</Label>
                <Select
                  value={srcKind}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSrcKind(e.target.value as 'env' | 'gitea')
                  }
                >
                  <Select.Option value='env'>Apper som er deployet i et miljø</Select.Option>
                  <Select.Option value='gitea'>Alle apper i Altinn Studio (uavhengig av deployment)</Select.Option>
                </Select>
              </Field>

              {srcKind === 'env' && (
                <Field>
                  <Label>Velg miljø</Label>
                  <Select
                    value={env}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setEnv(e.target.value as 'prod' | 'tt02')
                    }
                  >
                    <Select.Option value='prod'>prod (altinn.no)</Select.Option>
                    <Select.Option value='tt02'>tt02 (tt02.altinn.no)</Select.Option>
                  </Select>
                </Field>
              )}

              {srcKind === 'gitea' && (
                <Field>
                  <Label>Velg organisasjoner</Label>
                  <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                    Hentet med tokenene over
                    {ownersQ.data?.hosts?.length
                      ? ` fra ${ownersQ.data.hosts.join(' og ')}`
                      : ''}
                    . Velg så mange du vil.
                  </Paragraph>
                  <Textfield
                    aria-label='Filtrer organisasjoner'
                    placeholder='Filtrer…'
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                  />

                  {owners.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {owners.map((o) => (
                        <button
                          key={o}
                          type='button'
                          onClick={() => setOwners(owners.filter((x) => x !== o))}
                          className='rounded-full border border-[var(--ds-color-neutral-border-default)] px-2 py-0.5 text-xs hover:bg-[var(--ds-color-neutral-background-subtle)]'
                          aria-label={`Fjern ${o}`}
                        >
                          {o} ✕
                        </button>
                      ))}
                    </div>
                  )}

                  <div className='mt-2 max-h-56 overflow-y-auto rounded border border-[var(--ds-color-neutral-border-subtle)]'>
                    {ownerOptions.length === 0 && (
                      <p className='p-3 text-sm opacity-60'>
                        {ownersQ.isLoading ? 'Henter fra Altinn Studio…' : 'Ingen treff'}
                      </p>
                    )}
                    {ownerOptions.map((o) => (
                      <label
                        key={o.login}
                        className='flex cursor-pointer items-center gap-2 border-b border-[var(--ds-color-neutral-border-subtle)] px-3 py-1.5 text-sm last:border-0 hover:bg-[var(--ds-color-neutral-background-subtle)]'
                      >
                        <input
                          type='checkbox'
                          checked={owners.includes(o.login)}
                          onChange={(e) =>
                            setOwners(
                              e.target.checked
                                ? [...owners, o.login]
                                : owners.filter((x) => x !== o.login),
                            )
                          }
                        />
                        <span>
                          {o.login}
                          {o.note && (
                            <span className='opacity-60'> — {o.note}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>

                  {ownersQ.data?.error && (
                    <Paragraph data-size='sm' style={{ color: 'var(--ds-color-danger-text-default)' }}>
                      {ownersQ.data.error}
                    </Paragraph>
                  )}
                  {ownersQ.data?.user_error && (
                    <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {ownersQ.data.user_error}
                    </Paragraph>
                  )}
                  {preview.data && (
                    <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {preview.data.total} repoer blir hentet
                      {preview.data.owners.some((o) => o.error) &&
                        ` — ${preview.data.owners.filter((o) => o.error).map((o) => o.owner).join(', ')} kunne ikke leses`}
                    </Paragraph>
                  )}
                </Field>
              )}
            </div>
          </Card.Block>
        </Card>

        {/* altinn.studio */}
        <Card>
          <Card.Block>
            <Heading level={2} data-size='xs'>
              altinn.studio
            </Heading>
            <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Personal Access Token brukes til å klone offentlige repos. Token kreves selv om alt er
              offentlig.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <div className='space-y-3'>
              <Textfield
                label='Brukernavn'
                description='Valgfritt. Tomt felt bruker «oauth2» som dummy-brukernavn.'
                value={gitUser}
                onChange={(e) => setGitUser(e.target.value)}
                placeholder='ditt-altinn-studio-brukernavn'
              />

              <div className='flex items-end gap-2'>
                <div className='flex-1'>
                  <Textfield
                    label='Personal Access Token'
                    description={
                      gitTokenInfo?.set
                        ? `Token lagret: ${gitTokenInfo.preview}. La feltet stå tomt for å beholde.`
                        : 'Lim inn token fra Altinn Studio → Settings → Applications → Generate New Token'
                    }
                    type={showGitToken ? 'text' : 'password'}
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    placeholder={
                      gitTokenInfo?.set ? '•••••••• (allerede lagret)' : 'ghp_xxxxxxxxxxxxxxxx'
                    }
                    autoComplete='new-password'
                  />
                </div>
                <Button
                  type='button'
                  variant='tertiary'
                  data-size='sm'
                  onClick={() => setShowGitToken(!showGitToken)}
                >
                  {showGitToken ? 'Skjul' : 'Vis'}
                </Button>
                {gitTokenInfo?.set && (
                  <Button
                    type='button'
                    variant='secondary'
                    data-color='danger'
                    data-size='sm'
                    onClick={() => clearToken('git_token')}
                    disabled={saving}
                  >
                    Slett
                  </Button>
                )}
              </div>

              <div className='flex items-center gap-3'>
                <Button
                  type='button'
                  variant='secondary'
                  data-size='sm'
                  onClick={() => testConnection('altinn')}
                  disabled={testing !== null || (!gitToken && !gitTokenInfo?.set)}
                >
                  {testing === 'altinn' ? 'Tester…' : 'Test tilkobling'}
                </Button>
                {testResult?.target === 'altinn' && (
                  <Tag data-color={testResult.ok ? 'success' : 'danger'}>
                    {testResult.ok
                      ? `✓ ${testResult.message}${testResult.gitea_version ? ` (Gitea ${testResult.gitea_version})` : ''}`
                      : `✗ ${testResult.message}`}
                  </Tag>
                )}
              </div>
            </div>
          </Card.Block>
        </Card>

        {/* dev.altinn.studio */}
        <Card>
          <Card.Block>
            <Heading level={2} data-size='xs'>
              dev.altinn.studio
            </Heading>
            <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Brukes som fallback hvis en app sin release ikke finnes på altinn.studio. Valgfritt.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <div className='space-y-3'>
              <Textfield
                label='Brukernavn'
                description='Valgfritt'
                value={devGitUser}
                onChange={(e) => setDevGitUser(e.target.value)}
                placeholder='dev.altinn.studio-brukernavn'
              />

              <div className='flex items-end gap-2'>
                <div className='flex-1'>
                  <Textfield
                    label='Personal Access Token'
                    description={
                      devTokenInfo?.set
                        ? `Token lagret: ${devTokenInfo.preview}. La feltet stå tomt for å beholde.`
                        : 'Lim inn token fra dev.altinn.studio'
                    }
                    type={showDevToken ? 'text' : 'password'}
                    value={devGitToken}
                    onChange={(e) => setDevGitToken(e.target.value)}
                    placeholder={devTokenInfo?.set ? '•••••••• (allerede lagret)' : ''}
                    autoComplete='new-password'
                  />
                </div>
                <Button
                  type='button'
                  variant='tertiary'
                  data-size='sm'
                  onClick={() => setShowDevToken(!showDevToken)}
                >
                  {showDevToken ? 'Skjul' : 'Vis'}
                </Button>
                {devTokenInfo?.set && (
                  <Button
                    type='button'
                    variant='secondary'
                    data-color='danger'
                    data-size='sm'
                    onClick={() => clearToken('dev_git_token')}
                    disabled={saving}
                  >
                    Slett
                  </Button>
                )}
              </div>

              <div className='flex items-center gap-3'>
                <Button
                  type='button'
                  variant='secondary'
                  data-size='sm'
                  onClick={() => testConnection('dev_altinn')}
                  disabled={testing !== null || (!devGitToken && !devTokenInfo?.set)}
                >
                  {testing === 'dev_altinn' ? 'Tester…' : 'Test tilkobling'}
                </Button>
                {testResult?.target === 'dev_altinn' && (
                  <Tag data-color={testResult.ok ? 'success' : 'danger'}>
                    {testResult.ok
                      ? `✓ ${testResult.message}${testResult.gitea_version ? ` (Gitea ${testResult.gitea_version})` : ''}`
                      : `✗ ${testResult.message}`}
                  </Tag>
                )}
              </div>
            </div>
          </Card.Block>
        </Card>

        {/* Oppgradering til v9 */}
        <Card>
          <Card.Block>
            <Heading level={2} data-size='xs'>
              Oppgradering til v9
            </Heading>
            <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Appen hentes fra den Studio-instansen den finnes på, med tokenene
              over. Uten dette valget er en oppgradering en tørrkjøring:
              endringene blir liggende i en arbeidskopi.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <Field>
              <Checkbox
                label='Opprett pull requests automatisk'
                description='Krever at tokenet for instansen har write:repository. Altinn Studio avviser uansett en PR fra et token som bare kan lese.'
                checked={allowWrite}
                onChange={(e) => setAllowWrite(e.target.checked)}
              />
            </Field>
          </Card.Block>
        </Card>

        {/* Avansert */}
        <Card>
          <Card.Block>
            <Heading level={2} data-size='xs'>
              Avansert
            </Heading>
            <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Konkurranseinnstillinger. Høyere tall = raskere, men kan presse altinn.studio.
            </Paragraph>
          </Card.Block>
          <Card.Block>
            <div className='grid grid-cols-2 gap-4'>
              <Textfield
                label='Fetch concurrency'
                type='number'
                min={1}
                max={32}
                value={fetchConc}
                onChange={(e) => setFetchConc(parseInt(e.target.value) || 1)}
              />
              <Textfield
                label='Scan concurrency'
                type='number'
                min={1}
                max={32}
                value={scanConc}
                onChange={(e) => setScanConc(parseInt(e.target.value) || 1)}
              />
            </div>
          </Card.Block>
        </Card>

        {/* Lagre */}
        <div className='flex items-center gap-3'>
          <Button type='submit' disabled={saving} data-color='accent' variant='primary'>
            {saving ? 'Lagrer…' : 'Lagre'}
          </Button>
          {status && (
            <Paragraph
              data-size='sm'
              style={{
                color: status.ok
                  ? 'var(--ds-color-success-text-default)'
                  : 'var(--ds-color-danger-text-default)',
              }}
            >
              {status.msg}
            </Paragraph>
          )}
        </div>
      </div>

      {/* Høyre sidebar — kontekst + status */}
      <aside className='col-span-12 lg:col-span-4 space-y-4'>
        <Alert data-color='info'>
          <Heading level={3} data-size='2xs'>
            Hvorfor trengs et token?
          </Heading>
          <Paragraph data-size='sm'>
            altinn.studio (Gitea) krever autentisering selv mot offentlige repos. Token får{' '}
            <code>read:repository</code>-scope.
          </Paragraph>
        </Alert>

        <Card>
          <Card.Block>
            <Heading level={3} data-size='2xs'>
              Datastatus
            </Heading>
            <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Antall klonede apper per miljø
            </Paragraph>
          </Card.Block>
          {(['prod', 'tt02'] as const).map((envKey) => {
            const s = snapshot.data?.[envKey];
            return (
              <Card.Block key={envKey}>
                <div className='flex items-center justify-between'>
                  <span className='font-mono'>{envKey}</span>
                  <Tag data-color={s?.ok ? 'success' : 'neutral'}>{s?.ok ?? 0} klonet</Tag>
                </div>
                {s && s.failed > 0 && (
                  <Paragraph
                    data-size='xs'
                    style={{ color: 'var(--ds-color-warning-text-default)' }}
                  >
                    {s.failed} feilet, {s.total - s.ok - s.failed} ufullstendig
                  </Paragraph>
                )}
              </Card.Block>
            );
          })}
        </Card>

        <Card>
          <Card.Block>
            <Heading level={3} data-size='2xs'>
              Lagringssti
            </Heading>
            <Paragraph data-size='xs' style={{ wordBreak: 'break-all' }}>
              <code>{q.data?.overlay_file}</code>
            </Paragraph>
            <Paragraph data-size='xs' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              Fil med chmod 0600. Overlever container-restart.
            </Paragraph>
          </Card.Block>
        </Card>
      </aside>
    </form>
  );
}
