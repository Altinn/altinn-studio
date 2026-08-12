import { useState } from 'react';
import { Tag } from '@digdir/designsystemet-react';
import type { UpgradeEvent } from '../lib/api';

export type StepStatus = 'pending' | 'running' | 'ok' | 'warn' | 'fail' | 'skipped';

export type Step = {
  key: string;
  title: string;
  status: StepStatus;
  detail: string;
  items: string[];
  log: string[];
};

/** The pipeline, in order. Rendered greyed out before the run reaches them so
 *  the user can see up front what is going to happen. */
export const STEP_ORDER: Array<{ key: string; title: string }> = [
  { key: 'studioctl', title: 'Verifiser at studioctl er installert' },
  { key: 'studioctl_version', title: 'Sjekk at studioctl er oppdatert' },
  { key: 'clone', title: 'Hent appen fra Altinn Studio' },
  { key: 'preflight', title: 'Sjekk at appen kan oppgraderes' },
  { key: 'upgrade', title: 'Kjør migreringen til v9' },
  { key: 'build', title: 'Bygg appen etter oppgradering' },
  { key: 'publish', title: 'Opprett pull request' },
];

export function emptySteps(): Step[] {
  return STEP_ORDER.map((s) => ({
    ...s,
    status: 'pending' as StepStatus,
    detail: '',
    items: [],
    log: [],
  }));
}

/** Fold an event stream into step state. Pure, so it is easy to reason about. */
export function applyEvent(steps: Step[], ev: UpgradeEvent): Step[] {
  const anyEv = ev as any;
  const key: string | undefined = anyEv.step ?? anyEv.phase;
  if (!key) return steps;
  return steps.map((s) => {
    if (s.key !== key) return s;
    if (ev.kind === 'step') {
      return {
        ...s,
        status: (anyEv.status as StepStatus) ?? s.status,
        detail: ev.message || s.detail,
        items: anyEv.items?.length ? anyEv.items : s.items,
      };
    }
    return { ...s, log: [...s.log, ev.message] };
  });
}

const ICON: Record<StepStatus, { glyph: string; className: string; label: string }> = {
  pending: { glyph: '○', className: 'text-[var(--ds-color-neutral-text-subtle)]', label: 'Venter' },
  running: { glyph: '◐', className: 'text-[var(--ds-color-info-text-default)] animate-pulse', label: 'Kjører' },
  ok: { glyph: '✓', className: 'text-[var(--ds-color-success-text-default)]', label: 'Ferdig' },
  warn: { glyph: '!', className: 'text-[var(--ds-color-warning-text-default)]', label: 'Krever oppfølging' },
  fail: { glyph: '✕', className: 'text-[var(--ds-color-danger-text-default)]', label: 'Feilet' },
  skipped: { glyph: '–', className: 'text-[var(--ds-color-neutral-text-subtle)]', label: 'Hoppet over' },
};

function StepRow({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const icon = ICON[step.status];
  const hasLog = step.log.length > 0;

  return (
    <li className='border-b border-[var(--ds-color-neutral-border-subtle)] last:border-0'>
      <div className='flex items-start gap-3 py-3'>
        <span
          className={`mt-0.5 w-5 shrink-0 text-center text-base leading-none ${icon.className}`}
          role='img'
          aria-label={icon.label}
        >
          {icon.glyph}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-baseline gap-2'>
            <span
              className={
                step.status === 'pending' || step.status === 'skipped'
                  ? 'text-[var(--ds-color-neutral-text-subtle)]'
                  : 'font-medium'
              }
            >
              {step.title}
            </span>
            {step.status === 'warn' && (
              <Tag data-color='warning' data-size='sm'>
                Krever oppfølging
              </Tag>
            )}
            {step.status === 'skipped' && (
              <Tag data-color='neutral' data-size='sm'>
                Hoppet over
              </Tag>
            )}
          </div>

          {step.detail && (
            <p className='mt-0.5 text-sm text-[var(--ds-color-neutral-text-subtle)]'>
              {step.detail}
            </p>
          )}

          {step.items.length > 0 && (
            <ul className='mt-2 space-y-1'>
              {step.items.map((it, i) => (
                <li key={i} className='flex gap-2 text-sm'>
                  <span aria-hidden className='opacity-50'>
                    ☐
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )}

          {hasLog && (
            <>
              <button
                type='button'
                onClick={() => setOpen((v) => !v)}
                className='mt-2 text-xs underline underline-offset-2 opacity-70 hover:opacity-100'
              >
                {open ? 'Skjul' : 'Vis'} teknisk logg ({step.log.length} linjer)
              </button>
              {open && (
                <pre className='mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[var(--ds-color-neutral-border-subtle)] bg-[var(--ds-color-neutral-background-subtle)] p-2 font-mono text-[11px] leading-relaxed'>
                  {step.log.join('\n')}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className='rounded border border-[var(--ds-color-neutral-border-subtle)] px-4'>
      {steps.map((s) => (
        <StepRow key={s.key} step={s} />
      ))}
    </ol>
  );
}
