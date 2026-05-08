import React from 'react';

import { CheckmarkIcon, XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/features/navigation/components/Page.module.css';
import { SubformsForPage } from 'src/features/navigation/components/SubformsForPage';
import { useNavigateToPageWithValidation } from 'src/features/navigation/useNavigateToPageWithValidation';
import { useGetNavigationIsPrevented } from 'src/features/navigation/utils';
import { useNavigationParam } from 'src/hooks/navigation';
import { useProcessingMutation } from 'src/hooks/useProcessingMutation';

export function Page({
  page,
  onNavigate,
  hasErrors,
  isComplete,
  expandedByDefault,
}: {
  page: string;
  onNavigate?: () => void;
  hasErrors: boolean;
  isComplete: boolean;
  expandedByDefault?: boolean;
}) {
  const currentPageId = useNavigationParam('pageKey');
  const isCurrentPage = page === currentPageId;

  const performProcess = useProcessingMutation('navigate-page');
  const navigateToPageWithValidation = useNavigateToPageWithValidation();

  const navigationIsPrevented = useGetNavigationIsPrevented()(page);

  const handleNavigationClick = () => performProcess(() => navigateToPageWithValidation(page, onNavigate));

  return (
    <li className={classes.pageListItem}>
      <button
        disabled={navigationIsPrevented}
        aria-current={isCurrentPage ? 'page' : undefined}
        className={cn(classes.pageButton, 'fds-focus')}
        onClick={handleNavigationClick}
      >
        <PageSymbol
          error={hasErrors}
          complete={isComplete}
          active={isCurrentPage}
        />
        <span className={cn(classes.pageName, { [classes.pageNameActive]: isCurrentPage })}>
          <Lang id={page} />
          {isComplete && (
            <span className='sr-only'>
              <Lang id='navigation.page_complete' />
            </span>
          )}
          {hasErrors && (
            <span className='sr-only'>
              <Lang id='navigation.page_error' />
            </span>
          )}
        </span>
      </button>
      <SubformsForPage
        pageKey={page}
        expandedByDefault={expandedByDefault}
      />
    </li>
  );
}

function PageSymbol({ error, complete, active }: { error: boolean; complete: boolean; active: boolean }) {
  const showActive = active;
  const showError = error && !active;
  const showComplete = complete && !error && !active;

  const Icon = showError ? XMarkIcon : showComplete ? CheckmarkIcon : null;
  const testid = showError ? 'state-error' : showComplete ? 'state-complete' : undefined;

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
