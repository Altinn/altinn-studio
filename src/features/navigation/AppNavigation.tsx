import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { usePageGroups, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/features/navigation/AppNavigation.module.css';
import { PageGroup } from 'src/features/navigation/components/PageGroup';
import { TaskGroup } from 'src/features/navigation/components/TaskGroup';
import { useIsReceiptPage, useIsSubformPage } from 'src/features/routing/AppRoutingContext';

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pageGroups = usePageGroups();
  const taskGroups = usePageSettings().taskNavigation;

  const currentTaskId = useProcessTaskId();
  const isReceipt = useIsReceiptPage();
  const isSubform = useIsSubformPage();
  const isStateless = useApplicationMetadata().isStatelessApp;

  if (!isSubform && taskGroups.length) {
    return (
      <ul
        data-testid='page-navigation'
        className={classes.groupList}
      >
        {isStateless &&
          pageGroups &&
          // If we are in stateless, we are not in a process yet, so the page groups should come before anything else
          pageGroups.map((group) => (
            <PageGroup
              key={group.id}
              group={group}
              onNavigate={onNavigate}
            />
          ))}

        {taskGroups.map((taskGroup) => {
          if (!isStateless && pageGroups && 'taskId' in taskGroup && taskGroup.taskId === currentTaskId) {
            // taskGroup represents the current task, show the current page groups instead
            return pageGroups.map((group) => (
              <PageGroup
                key={group.id}
                group={group}
                onNavigate={onNavigate}
              />
            ));
          }

          const receiptActive = 'type' in taskGroup && taskGroup.type === 'receipt' && isReceipt;
          const taskActive = 'taskId' in taskGroup && taskGroup.taskId === currentTaskId;
          return (
            <TaskGroup
              key={taskGroup.id}
              group={taskGroup}
              active={receiptActive || taskActive}
            />
          );
        })}
      </ul>
    );
  }

  if (pageGroups) {
    return (
      <ul
        data-testid='page-navigation'
        className={classes.groupList}
      >
        {pageGroups.map((group) => (
          <PageGroup
            key={group.id}
            group={group}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    );
  }

  return null;
}

export const appNavigationHeadingId = 'app-navigation-heading';
export function AppNavigationHeading({
  showClose,
  onClose,
}: { showClose?: undefined; onClose?: undefined } | { showClose: boolean; onClose: () => void }) {
  const { langAsString } = useLanguage();
  return (
    <div
      id={appNavigationHeadingId}
      className={classes.navigationHeading}
    >
      <Heading
        id='app-navigation-heading'
        level={3}
        data-size='xs'
      >
        <Lang id='navigation.form_pages' />
      </Heading>
      {showClose && (
        <Button
          variant='tertiary'
          color='second'
          size='sm'
          icon
          onClick={onClose}
          aria-label={langAsString('general.close')}
          className={classes.closeButton}
        >
          <XMarkIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}
