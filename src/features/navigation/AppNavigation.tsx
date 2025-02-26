import React, { useLayoutEffect, useState } from 'react';

import { Button, Heading, Spinner } from '@digdir/designsystemet-react';
import {
  CardIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  FolderIcon,
  InformationIcon,
  PencilLineIcon,
  ReceiptIcon,
  SealCheckmarkIcon,
  TasklistIcon,
  XMarkIcon,
} from '@navikt/aksel-icons';
import cn from 'classnames';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { usePageGroups, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useGetAltinnTaskType } from 'src/features/instance/ProcessContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/features/navigation/AppNavigation.module.css';
import {
  isSingleGroup,
  useGetTaskGroupType,
  useGetTaskName,
  useValidationsForPages,
  useVisiblePages,
} from 'src/features/navigation/utils';
import { useIsReceiptPage, useIsSubformPage, useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import type {
  NavigationPageGroup,
  NavigationPageGroupMultiple,
  NavigationPageGroupSingle,
  NavigationReceipt,
  NavigationTask,
} from 'src/layout/common.generated';

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pageGroups = usePageGroups();
  const taskGroups = usePageSettings().taskNavigation;

  const currentTaskId = useProcessTaskId();
  const isReceipt = useIsReceiptPage();
  const isSubform = useIsSubformPage();

  if (!isSubform && taskGroups.length) {
    return (
      <ul
        data-testid='page-navigation'
        className={classes.groupList}
      >
        {taskGroups.map((taskGroup) => {
          if ('taskId' in taskGroup && taskGroup.taskId === currentTaskId && pageGroups) {
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

export function AppNavigationHeading({
  showClose,
  onClose,
}: { showClose?: undefined; onClose?: undefined } | { showClose: true; onClose: () => void }) {
  const { langAsString } = useLanguage();
  return (
    <div className={classes.navigationHeading}>
      <Heading
        id='app-navigation-heading'
        level={3}
        size='xs'
      >
        <Lang id='navigation.form_pages' />
      </Heading>
      {showClose && (
        <Button
          variant='tertiary'
          color='second'
          size='sm'
          icon={true}
          onClick={onClose}
          aria-label={langAsString('general.close')}
        >
          <XMarkIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}

function getTaskIcon(taskType: string | undefined) {
  switch (taskType) {
    case 'data':
      return TasklistIcon;
    case 'confirmation':
      return SealCheckmarkIcon;
    case 'signing':
      return PencilLineIcon;
    case 'payment':
      return CardIcon;
    case 'receipt':
      return ReceiptIcon;
    default:
      return FolderIcon;
  }
}

function TaskGroup({ group, active }: { group: NavigationTask | NavigationReceipt; active: boolean }) {
  const getTaskType = useGetTaskGroupType();
  const getTaskName = useGetTaskName();

  const Icon = getTaskIcon(getTaskType(group));

  return (
    <li>
      <button
        aria-current={active ? 'step' : undefined}
        disabled
        className={cn(classes.taskButton, 'fds-focus')}
      >
        <div className={cn(classes.groupSymbol, active ? classes.taskSymbolActive : classes.taskSymbolLocked)}>
          <Icon aria-hidden />
        </div>
        <span className={cn(classes.groupName, { [classes.groupNameActive]: active })}>
          <Lang id={getTaskName(group)} />
        </span>
      </button>
    </li>
  );
}

function PageGroup({ group, onNavigate }: { group: NavigationPageGroup; onNavigate?: () => void }) {
  const visiblePages = useVisiblePages(group.order);
  const currentPageId = useNavigationParam('pageKey');
  const containsCurrentPage = visiblePages.some((page) => page === currentPageId);
  const validations = useValidationsForPages(visiblePages, group.markWhenCompleted);

  if (visiblePages.length === 0) {
    return null;
  }

  if (isSingleGroup(group)) {
    return (
      <PageGroupSingle
        group={group}
        visiblePages={visiblePages}
        containsCurrentPage={containsCurrentPage}
        validations={validations}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <PageGroupMultiple
      group={group}
      visiblePages={visiblePages}
      containsCurrentPage={containsCurrentPage}
      validations={validations}
      onNavigate={onNavigate}
    />
  );
}

type PageGroupProps<T extends NavigationPageGroup> = {
  group: T;
  visiblePages: string[];
  containsCurrentPage: boolean;
  validations: ReturnType<typeof useValidationsForPages>;
  onNavigate?: () => void;
};

function PageGroupSingle({
  group,
  containsCurrentPage: isCurrentPage,
  validations,
  onNavigate,
}: PageGroupProps<NavigationPageGroupSingle>) {
  const { navigateToPage } = useNavigatePage();
  const { performProcess, isAnyProcessing, isThisProcessing: isNavigating } = useIsProcessing();
  const page = group.order[0];

  return (
    <li>
      <button
        disabled={isAnyProcessing}
        aria-current={isCurrentPage ? 'page' : undefined}
        className={cn(classes.groupButton, classes.groupButtonSingle, 'fds-focus')}
        onClick={() =>
          performProcess(async () => {
            if (!isCurrentPage) {
              await navigateToPage(page);
              onNavigate?.();
            }
          })
        }
      >
        <PageGroupSymbol
          single
          type={group.type}
          active={isCurrentPage}
          error={validations !== ContextNotProvided && validations.hasErrors.group}
          complete={validations !== ContextNotProvided && validations.isCompleted.group}
          isLoading={isNavigating}
        />
        <span className={cn(classes.groupName, { [classes.groupNameActive]: isCurrentPage })}>
          <Lang id={page} />
        </span>
      </button>
    </li>
  );
}

function PageGroupMultiple({
  group,
  visiblePages,
  containsCurrentPage,
  validations,
  onNavigate,
}: PageGroupProps<NavigationPageGroupMultiple>) {
  const { langAsString } = useLanguage();
  const buttonId = `navigation-button-${group.id}`;
  const listId = `navigation-page-list-${group.id}`;

  const [isOpen, setIsOpen] = useState(containsCurrentPage);
  useLayoutEffect(() => setIsOpen(containsCurrentPage), [containsCurrentPage]);

  return (
    <li>
      <button
        id={buttonId}
        aria-current={containsCurrentPage ? 'step' : undefined}
        aria-expanded={isOpen}
        aria-owns={listId}
        aria-label={langAsString(group.name)}
        className={cn(classes.groupButton, { [classes.groupButtonOpen]: isOpen }, 'fds-focus')}
        onClick={() => setIsOpen((o) => !o)}
      >
        <PageGroupSymbol
          open={isOpen}
          type={group.type}
          active={containsCurrentPage}
          error={validations !== ContextNotProvided && validations.hasErrors.group}
          complete={validations !== ContextNotProvided && validations.isCompleted.group}
        />
        <span className={cn(classes.groupName, { [classes.groupNameActive]: containsCurrentPage && !isOpen })}>
          <Lang id={group.name} />
        </span>
        <ChevronDownIcon
          aria-hidden
          data-testid='chevron'
          className={cn(classes.groupChevron, { [classes.groupChevronOpen]: isOpen })}
        />
      </button>
      {isOpen && (
        <ul
          id={listId}
          aria-labelledby={buttonId}
          className={classes.pageList}
        >
          {visiblePages.map((page) => (
            <Page
              key={page}
              page={page}
              onNavigate={onNavigate}
              hasErrors={validations !== ContextNotProvided && validations.hasErrors.pages[page]}
              isComplete={validations !== ContextNotProvided && validations.isCompleted.pages[page]}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function PageGroupSymbol({
  type,
  error,
  complete,
  active,
  single = false,
  open = false,
  isLoading = false,
}: {
  type: NavigationPageGroup['type'];
  error: boolean;
  complete: boolean;
  active: boolean;
  single?: boolean;
  open?: boolean;
  isLoading?: boolean;
}) {
  const { langAsString } = useLanguage();
  const getTaskType = useGetAltinnTaskType();
  const currentTaskId = useProcessTaskId();

  const showActive = active && !open;
  const showError = error && !active && !open;
  const showComplete = complete && !error && !active && !open;

  const Icon = showError
    ? XMarkIcon
    : showComplete
      ? CheckmarkIcon
      : type === 'info'
        ? InformationIcon
        : !single
          ? getTaskIcon(getTaskType(currentTaskId))
          : null;

  const testid = showError ? 'state-error' : showComplete ? 'state-complete' : undefined;

  if (isLoading) {
    return (
      <Spinner
        style={{ width: 28, height: 28 }}
        title={langAsString('general.loading')}
      />
    );
  }

  return (
    <div
      className={cn(classes.groupSymbol, {
        [classes.groupSymbolInfo]: type === 'info',
        [classes.groupSymbolSingle]: single,
        [classes.groupSymbolError]: showError,
        [classes.groupSymbolComplete]: showComplete,
        [classes.groupSymbolActive]: showActive,
        [classes.groupSymbolDefault]: !showError && !showComplete && !showActive,
      })}
    >
      {Icon && (
        <Icon
          aria-hidden
          data-testid={testid}
        />
      )}
    </div>
  );
}

function Page({
  page,
  onNavigate,
  hasErrors,
  isComplete,
}: {
  page: string;
  onNavigate?: () => void;
  hasErrors: boolean;
  isComplete: boolean;
}) {
  const currentPageId = useNavigationParam('pageKey');
  const isCurrentPage = page === currentPageId;

  const { navigateToPage } = useNavigatePage();
  const { performProcess, isAnyProcessing, isThisProcessing: isNavigating } = useIsProcessing();

  return (
    <li className={classes.pageListItem}>
      <button
        disabled={isAnyProcessing}
        aria-current={isCurrentPage ? 'page' : undefined}
        className={cn(classes.pageButton, 'fds-focus')}
        onClick={() =>
          performProcess(async () => {
            if (!isCurrentPage) {
              await navigateToPage(page);
              onNavigate?.();
            }
          })
        }
      >
        <PageSymbol
          error={hasErrors}
          complete={isComplete}
          active={isCurrentPage}
          isLoading={isNavigating}
        />

        <span className={cn(classes.pageName, { [classes.pageNameActive]: isCurrentPage })}>
          <Lang id={page} />
        </span>
      </button>
    </li>
  );
}

function PageSymbol({
  error,
  complete,
  active,
  isLoading,
}: {
  error: boolean;
  complete: boolean;
  active: boolean;
  isLoading: boolean;
}) {
  const { langAsString } = useLanguage();
  const showActive = active;
  const showError = error && !active;
  const showComplete = complete && !error && !active;

  const Icon = showError ? XMarkIcon : showComplete ? CheckmarkIcon : null;
  const testid = showError ? 'state-error' : showComplete ? 'state-complete' : undefined;

  if (isLoading) {
    return (
      <Spinner
        style={{ width: 20, height: 20 }}
        title={langAsString('general.loading')}
      />
    );
  }

  return (
    <div
      className={cn(classes.pageSymbol, {
        [classes.pageSymbolActive]: showActive,
        [classes.pageSymbolError]: showError,
        [classes.pageSymbolComplete]: showComplete,
        [classes.pageSymbolDefault]: !showError && !showComplete,
      })}
    >
      {Icon && (
        <Icon
          aria-hidden
          data-testid={testid}
        />
      )}
    </div>
  );
}
