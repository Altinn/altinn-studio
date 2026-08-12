import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { api, subscribeToUpgrade, upgradeApi, type UpgradeEvent } from '../lib/api';
import { applyEvent, emptySteps, StepList, type Step } from '../components/StepList';

/** Live view of one upgrade: the step list, then what remains when it is done. */
export function UpgradeRunPage() {
  const { appId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job') ?? '';

  const [steps, setSteps] = useState<Step[]>(emptySteps);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const cfg = useQuery({ queryKey: ['config'], queryFn: api.config });
  const conf: any = cfg.data ?? {};

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    setSteps(emptySteps());
    setDone(false);
    try {
      const r = await upgradeApi.start(appId);
      setParams({ job: r.job_id }, { replace: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }, [appId, setParams]);

  useEffect(() => {
    if (!jobId) return;
    setSteps(emptySteps());
    setDone(false);
    const stop = subscribeToUpgrade(
      jobId,
      (ev: UpgradeEvent) => {
        setSteps((prev) => applyEvent(prev, ev));
        if (ev.kind === 'done') setDone(true);
      },
      (e) => setError(e.message),
    );
    return stop;
  }, [jobId]);

  const running = Boolean(jobId) && !done;
  const followUps = steps.flatMap((s) => s.items);
  const publish = steps.find((s) => s.key === 'publish');
  const prUrl = publish?.detail.match(/https?:\/\/\S+/)?.[0];

  return (
    <div className='space-y-4'>
      <div>
        <Link to='/upgrade' className='text-sm underline underline-offset-2'>
          ← Alle apper
        </Link>
        <Heading level={2} data-size='sm' className='mt-1'>
          Oppdater {appId}
        </Heading>
        <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          Instansen velges automatisk ut fra hvor appen finnes
        </Paragraph>
      </div>

      {error && (
        <Alert data-color='danger' data-size='sm'>
          {error}
        </Alert>
      )}

      {!jobId && (
        <Alert data-color='info' data-size='sm'>
          <Paragraph data-size='sm'>
            Appen klones til en egen arbeidskopi, migreres med studioctl og
            bygges. Ingenting i den opprinnelige appen endres underveis.
          </Paragraph>
        </Alert>
      )}

      <StepList steps={steps} />

      {done && (
        <Alert
          data-color={
            steps.some((s) => s.status === 'fail')
              ? 'danger'
              : followUps.length
                ? 'warning'
                : 'success'
          }
          data-size='sm'
        >
          <Heading level={3} data-size='xs'>
            {steps.some((s) => s.status === 'fail')
              ? 'Oppgraderingen stoppet'
              : followUps.length
                ? `Oppgradert — ${followUps.length} ting gjenstår`
                : 'Oppgradert, ingenting gjenstår'}
          </Heading>
          {followUps.length > 0 && (
            <Paragraph data-size='sm'>
              Punktene ligger som avkryssingsliste i pull requesten, så du
              slipper å holde dem i hodet.
            </Paragraph>
          )}
          {prUrl && (
            <Paragraph data-size='sm'>
              <a href={prUrl} target='_blank' rel='noreferrer' className='underline'>
                Åpne pull request
              </a>
            </Paragraph>
          )}
          {publish?.status === 'skipped' && (
            <Paragraph data-size='sm'>{publish.detail}</Paragraph>
          )}
        </Alert>
      )}

      <div className='flex gap-2'>
        <Button onClick={start} disabled={running || starting} data-size='sm'>
          {running ? 'Kjører…' : jobId ? 'Kjør på nytt' : 'Start oppdatering'}
        </Button>
        {running && (
          <Button
            variant='secondary'
            data-size='sm'
            onClick={() => upgradeApi.cancel(jobId)}
          >
            Avbryt
          </Button>
        )}
      </div>
    </div>
  );
}
