import React from 'react';

import { Button } from '@app/form-component';
import { Heading, Paragraph } from '@digdir/designsystemet-react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppOwner } from 'src/core/texts/appTexts';
import { useProcessNextOutsideFormProvider, useProcessResume } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/features/process/service/ServiceTaskFailed.module.css';
import { getPageTitle } from 'src/utils/getPageTitle';

/**
 * The recoverable failure view for a service task whose workflow failed terminally. Unlike the
 * generic WorkflowFailed page, this failure has a task UI owner, so it offers recovery actions:
 * retry (resume the failed workflow) and back (bpmn-allowed reject).
 */
export function ServiceTaskFailed() {
  const langTools = useLanguage();
  const appOwner = useAppOwner();

  return (
    <>
      <title>{`${getPageTitle('', langTools.langAsString('service_task.title'), appOwner)}`}</title>
      <div>
        <Heading
          level={1}
          data-size='lg'
        >
          <Lang id='service_task.title' />
        </Heading>
        <Paragraph>
          <Lang id='service_task.body' />
        </Paragraph>
        <Paragraph>
          <Lang
            id='service_task.help_text'
            params={[
              <Lang
                key={0}
                id='service_task.retry_button'
              />,
              <Lang
                key={1}
                id='general.customer_service_phone_number'
              />,
            ]}
          />
        </Paragraph>
        <div className={classes.buttons}>
          <RetryButton />
          <BackButton />
        </div>
      </div>
      <ReadyForPrint type='load' />
    </>
  );
}

const RetryButton = () => {
  const { langAsString } = useLanguage();
  const canRetry = useIsAuthorized()('write');
  // This view only renders when the workflow failure is owned by the current service task, which
  // means the workflow is terminally failed: process/next is blocked (409/resumeRequired) until
  // it is resumed, so "retry" goes through process/resume - the engine re-runs the failed step in
  // place. (A parked-but-healthy service task renders ServiceTaskWaiting instead, with no manual
  // retry affordance.)
  // Use mutate (not mutateAsync): failures are handled by the mutation's own onError (toast +
  // refetch), and an un-awaited mutateAsync would surface them as unhandled promise rejections.
  const { mutate: processResume, isPending: isResuming } = useProcessResume();

  return (
    <Button
      id='service-task-retry-button'
      onClick={() => processResume()}
      disabled={!canRetry}
      isLoading={isResuming}
      loadingLabel={langAsString('general.loading')}
      color='success'
    >
      <Lang id='service_task.retry_button' />
    </Button>
  );
};

const BackButton = () => {
  const { langAsString } = useLanguage();
  const canReject = useIsAuthorized()('reject');
  // Use mutate (not mutateAsync) - see RetryButton.
  const { mutate: processReject, isPending: isRejecting } = useProcessNextOutsideFormProvider({
    action: 'reject',
  });

  if (!canReject) {
    return null;
  }

  return (
    <Button
      id='service-task-back-button'
      onClick={() => processReject()}
      disabled={isRejecting}
      isLoading={isRejecting}
      loadingLabel={langAsString('general.loading')}
      color='second'
    >
      <Lang id='service_task.back_button' />
    </Button>
  );
};
