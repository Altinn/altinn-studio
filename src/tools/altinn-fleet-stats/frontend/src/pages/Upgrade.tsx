import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Heading,
  Paragraph,
  Search,
  Spinner,
  Tag,
} from '@digdir/designsystemet-react';
import {
  api,
  upgradeApi,
  type UpgradeCandidate,
  type UpgradeOutcome,
} from '../lib/api';

/** The four outcomes studioctl can produce. `manual` is a normal result of a
 *  major-version bump, not a failure — the colours say so. */
const OUTCOME: Record<UpgradeOutcome, { label: string; color: 'success' | 'warning' | 'danger' | 'info'; help: string }> = {
  clean: {
    label: 'Oppgradert rent',
    color: 'success',
    help: 'studioctl fullførte uten advarsler.',
  },
  manual: {
    label: 'Krever håndarbeid',
    color: 'warning',
    help: 'Oppgradert, men appen bruker API-er som er fjernet i v9 og må portes for hånd. Et forventet utfall av et hovedversjonsbytte.',
  },
  rejected: {
    label: 'Avvist',
    color: 'info',
    help: 'studioctls versjonssjekk nektet å starte. Appen er ikke endret.',
  },
  failed: {
    label: 'Feilet',
    color: 'danger',
    help: 'Selve oppgraderingen gikk galt.',
  },
};

function OutcomeTag({ outcome }: { outcome: UpgradeOutcome }) {
  const o = OUTCOME[outcome];
  return (
    <Tag data-color={o.color} data-size='sm'>
      {o.label}
    </Tag>
  );
}

export function UpgradePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const cfg = useQuery({ queryKey: ['config'], queryFn: api.config });
  const cands = useQuery({
    queryKey: ['upgrade-candidates'],
    queryFn: upgradeApi.candidates,
  });
  const tok = useQuery({
    queryKey: ['upgrade-token'],
    queryFn: upgradeApi.tokenStatus,
  });

  const conf: any = cfg.data ?? {};
  const hosts = tok.data?.hosts ?? [];
  const hasToken = hosts.some((h) => h.has_token);
  const writable = hosts.find((h) => h.can_write);

  const rows = (cands.data ?? []).filter((c) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return c.app_id.toLowerCase().includes(t) || c.org.toLowerCase().includes(t);
  });

  function open(c: UpgradeCandidate) {
    navigate(`/upgrade/${encodeURIComponent(c.app_id)}`);
  }

  return (
    <div className='space-y-4'>
      <Heading level={2} data-size='sm'>
        Oppgrader til v9
      </Heading>

      <Alert data-color='info' data-size='sm'>
        <Paragraph data-size='sm'>
          Appen hentes fra den Studio-instansen den finnes på, med tokenene fra
          Konfigurasjon.
        </Paragraph>
        <ul className='mt-1 space-y-0.5 text-sm'>
          {hosts.map((h) => (
            <li key={h.studio}>
              <code>{h.studio.replace('https://', '')}</code>{' '}
              {!h.has_token
                ? '— ingen token'
                : h.error
                  ? `— ${h.error}`
                  : `— ${h.scopes.join(', ')}${h.can_write ? ' (kan opprette PR)' : ' (kun lesing)'}`}
            </li>
          ))}
        </ul>
        <Paragraph data-size='sm'>
          Appen klones til en egen arbeidskopi og endres kun der.{' '}
          {tok.data?.can_open_pr
            ? `Pull requests opprettes på ${writable?.studio.replace('https://', '')}.`
            : !tok.data?.allow_gitea_write
              ? 'Oppretting av pull requests er slått av under Konfigurasjon — kjøringen blir en tørrkjøring.'
              : 'Ingen av tokenene har skrivetilgang, så Altinn Studio vil avvise enhver PR uansett.'}
        </Paragraph>
      </Alert>

      {!hasToken && (
        <Alert data-color='danger' data-size='sm'>
          Mangler token for {conf.upgrade_studio_base}. Legg det inn under
          Konfigurasjon — Gitea krever autentisering også for åpne repoer.
        </Alert>
      )}

      <Search>
        <Search.Input
          aria-label='Filtrer apper'
          placeholder='Filtrer på app eller organisasjon…'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Search.Clear onClick={() => setQ('')} />
      </Search>

      {cands.isLoading && (
        <div className='flex items-center gap-2'>
          <Spinner aria-label='Laster' data-size='sm' /> Laster apper…
        </div>
      )}

      {cands.data && (
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {rows.length} av {cands.data.length} apper på Altinn.App 8.x.{' '}
          {cands.data.filter((c) => !c.eligible).length} av dem vil bli avvist av
          versjonssjekken — se begrunnelsen i tabellen.
        </Paragraph>
      )}

      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-[var(--ds-color-neutral-border-default)] text-left'>
              <th className='py-2 pr-3'>App</th>
              <th className='py-2 pr-3'>Versjon</th>
              <th className='py-2 pr-3'>Sist</th>
              <th className='py-2 pr-3'>Status</th>
              <th className='py-2' />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.app_id}
                className='border-b border-[var(--ds-color-neutral-border-subtle)] align-top'
              >
                <td className='py-2 pr-3'>
                  <div className='font-medium'>
                    {c.org}/{c.app_name}
                  </div>
                  {!c.eligible && (
                    <div className='mt-1 max-w-xl text-xs text-[var(--ds-color-neutral-text-subtle)]'>
                      {c.reasons.join(' ')}
                    </div>
                  )}
                </td>
                <td className='py-2 pr-3 font-mono text-xs'>{c.backend_version}</td>
                <td className='py-2 pr-3 text-xs text-[var(--ds-color-neutral-text-subtle)]'>
                  {c.last_run_at ? c.last_run_at.slice(0, 16).replace('T', ' ') : '—'}
                </td>
                <td className='py-2 pr-3'>
                  {c.running ? (
                    <Tag data-color='info' data-size='sm'>
                      Kjører
                    </Tag>
                  ) : c.last_outcome ? (
                    <OutcomeTag outcome={c.last_outcome} />
                  ) : (
                    <span className='text-xs opacity-50'>Ikke forsøkt</span>
                  )}
                </td>
                <td className='py-2 text-right'>
                  <Button
                    data-size='sm'
                    variant='secondary'
                    disabled={!c.eligible || c.running || !hasToken}
                    onClick={() => open(c)}
                  >
                    Oppdater
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cands.data && rows.length === 0 && (
        <Paragraph data-size='sm'>Ingen apper matcher «{q}».</Paragraph>
      )}
    </div>
  );
}
