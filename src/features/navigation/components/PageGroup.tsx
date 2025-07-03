import React, { useLayoutEffect, useState } from 'react';

import { Spinner } from '@digdir/designsystemet-react';
import { CheckmarkIcon, ChevronDownIcon, InformationIcon, XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useGetAltinnTaskType } from 'src/features/instance/useProcessQuery';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { Page } from 'src/features/navigation/components/Page';
import classes from 'src/features/navigation/components/PageGroup.module.css';
import { SubformsForPage } from 'src/features/navigation/components/SubformsForPage';
import { getTaskIcon, isSingleGroup, useValidationsForPages, useVisiblePages } from 'src/features/navigation/utils';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import type {
  NavigationPageGroup,
  NavigationPageGroupMultiple,
  NavigationPageGroupSingle,
} from 'src/layout/common.generated';

export function PageGroup({ group, onNavigate }: { group: NavigationPageGroup; onNavigate?: () => void }) {
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
      <SubformsForPage pageKey={page} />
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
      <ul
        id={listId}
        aria-labelledby={buttonId}
        style={!isOpen ? { display: 'none' } : undefined}
        className={cn(classes.pageList)}
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
        aria-label={langAsString('general.loading')}
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
