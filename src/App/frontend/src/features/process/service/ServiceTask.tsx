import React from 'react';

import { Button } from '@app/form-component';
import { Heading, Paragraph } from '@digdir/designsystemet-react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppOwner } from 'src/core/texts/appTexts';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/features/process/service/ServiceTask.module.css';
import { getPageTitle } from 'src/utils/getPageTitle';

export function ServiceTask() {
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
  // Use mutate (not mutateAsync): failures are handled by the mutation's own onError (toast +
  // refetch), and an un-awaited mutateAsync would surface them as unhandled promise rejections.
  const { mutate: processRetry, isPending: isRetrying } = useProcessNextOutsideFormProvider();

  return (
    <Button
      id='service-task-retry-button'
      onClick={() => processRetry()}
      disabled={!canRetry}
      isLoading={isRetrying}
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
