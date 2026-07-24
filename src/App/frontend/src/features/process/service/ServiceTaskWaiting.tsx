import React from 'react';

import { Flex, Spinner } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';

import classes from 'src/components/process/ProcessWrapper.module.css';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppOwner } from 'src/core/texts/appTexts';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getPageTitle } from 'src/utils/getPageTitle';

/**
 * The implicit waiting view for a service task the process is parked on: the task's work is
 * pending an outcome (in flight, or waiting for an external callback), nothing has failed, and
 * the app supplied no layout of its own. Purely presentational - the polling that carries the
 * user forward when the process advances lives in ProcessWrapper (useFollowProcess), which also
 * covers service tasks that DO have a custom layout.
 *
 * Both messages are text resources, so an app can override them (e.g. to explain a known-slow
 * external dependency) without giving up the default view.
 */
export function ServiceTaskWaiting() {
  const { langAsString } = useLanguage();
  const appOwner = useAppOwner();

  return (
    <Flex
      item
      size={{ xs: 12 }}
      aria-live='polite'
      id='ServiceTaskWaitingContainer'
    >
      <title>{`${getPageTitle('', langAsString('service_task.waiting_title'), appOwner)}`}</title>
      <div className={classes.processingContainer}>
        <Spinner
          aria-hidden='true'
          aria-label={langAsString('general.loading')}
          data-size='xl'
        />
        <Heading
          level={2}
          data-size='sm'
        >
          <Lang id='service_task.waiting_title' />
        </Heading>
        <div className={classes.processingNote}>
          <Lang id='service_task.waiting_body' />
        </div>
      </div>
      <ReadyForPrint type='load' />
    </Flex>
  );
}
