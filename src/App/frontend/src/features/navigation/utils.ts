import { useMemo } from 'react';

import {
  CardIcon,
  FolderIcon,
  PencilLineIcon,
  ReceiptIcon,
  SealCheckmarkIcon,
  TasklistIcon,
} from '@navikt/aksel-icons';

import { useIsReceiptPage } from 'src/core/routing/useIsReceiptPage';
import { FormStore } from 'src/features/form/FormContext';
import { usePageGroups, usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { useGetAltinnTaskType } from 'src/features/instance/useProcessQuery';
import { getValidationsForNode } from 'src/features/validation/deriveValidationState';
import { getVisibilityMask } from 'src/features/validation/utils';
import { useGetDerivedValidationState, usePageValidations } from 'src/features/validation/validationHooks';
import { useNavigationParam } from 'src/hooks/navigation';
import { usePageOrder, useVisitedPages } from 'src/hooks/useNavigatePage';
import { useHiddenPages } from 'src/utils/layout/hidden';
import type { ContextNotProvided } from 'src/core/contexts/context';
import type { NavigationReceipt, NavigationTask } from 'src/features/form/ui/types';

export function useHasGroupedNavigation() {
  const pageGroups = usePageGroups();
  const taskGroups = usePageSettings().taskNavigation;
  const isReceiptPage = useIsReceiptPage();
  return Boolean(!isReceiptPage && (pageGroups?.length || taskGroups.length));
}

export const SIDEBAR_BREAKPOINT = 1341;

export function useVisiblePages(order: string[]) {
  const hiddenPages = useHiddenPages();
  return useMemo(() => order.filter((page) => !hiddenPages.has(page)), [order, hiddenPages]);
}

export function useGetTaskGroupType() {
  const getTaskType = useGetAltinnTaskType();
  return (group: NavigationTask | NavigationReceipt) => ('taskId' in group ? getTaskType(group.taskId) : group.type);
}

/**
 * If no name is is given to the navigation task, a default name will be used instead.
 */
export function useGetTaskName() {
  const getTaskType = useGetTaskGroupType();

  return (group: NavigationTask | NavigationReceipt) => {
    if (group.name) {
      return group.name;
    }

    const type = getTaskType(group);
    if (!type) {
      if ('taskId' in group) {
        window.logErrorOnce(`Navigation component could not find a task with id '${group.taskId}'.`);
      }
      return '';
    }

    return `taskTypes.${type}`;
  };
}

export function getTaskIcon(taskType: string | undefined) {
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

/**
 * Returns the necessary information to mark states on a group and its pages.
 * Explanation on the current logic:
 * 1. A page is marked with error if any of its nodes have visible errors.
 * 2. A group is marked with error if any of its pages have nodes with visible errors.
 * 3. A page is marked as completed if there are no nodes with any validations errors (visible or not), and the page is marked as 'visited'.
 * 4. A group is marked as completed if all of its pages have no nodes with any validations errors (visible or not), and all of the pages are marked as 'visited'.
 */
export function useValidationsForPages(order: string[], shouldMarkWhenCompleted = false) {
  const pageValidations = usePageValidations(order);
  const [visitedPages] = useVisitedPages();

  const isCompleted = useMemo(() => {
    if (!shouldMarkWhenCompleted) {
      return { group: false, pages: Object.fromEntries(order.map((page) => [page, false])) };
    }

    const pageHasNoErrors = Object.fromEntries(
      order.map((page) => [page, pageValidations[page].allErrors.length === 0]),
    );

    const completedPages = Object.fromEntries(
      order.map((page) => [page, pageHasNoErrors[page] && visitedPages.includes(page)]),
    );

    const groupIsComplete = order.every((page) => pageHasNoErrors[page] && visitedPages.includes(page));

    return { pages: completedPages, group: groupIsComplete };
  }, [order, pageValidations, shouldMarkWhenCompleted, visitedPages]);

  const hasErrors = useMemo(() => {
    const pageHasErrors = Object.fromEntries(
      order.map((page) => [page, pageValidations[page].visibleErrors.length > 0]),
    );

    const groupHasErrors = Object.values(pageHasErrors).some((p) => p);

    return { pages: pageHasErrors, group: groupHasErrors };
  }, [order, pageValidations]);

  return { isCompleted, hasErrors } as
    | { isCompleted: typeof isCompleted; hasErrors: typeof hasErrors }
    | typeof ContextNotProvided;
}

//Prevents navigation to a page if there are pages between the current page and the target page that have validateOnNavigation enabled and contain validation errors.
export function useGetNavigationIsPrevented() {
  const currentPageId = useNavigationParam('pageKey') ?? '';
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const globalValidationOnNavigation = usePageSettings().validationOnNavigation;
  const order = usePageOrder();
  const getDerivedValidationState = useGetDerivedValidationState();

  return (targetPageKey: string): boolean => {
    const derived = getDerivedValidationState();
    const currentIndex = order.indexOf(currentPageId);
    const targetIndex = order.indexOf(targetPageKey);

    if (currentIndex === -1 || targetIndex === -1 || targetIndex <= currentIndex) {
      return false;
    }

    return order.slice(currentIndex + 1, targetIndex).some((pageId) => {
      const validationOnNavigation =
        layoutCollection[pageId]?.data?.validationOnNavigation ?? globalValidationOnNavigation;

      if (!validationOnNavigation) {
        return false;
      }

      const mask = getVisibilityMask(validationOnNavigation.show);
      return (derived.nodeIdsByPage.get(pageId) ?? []).some((nodeId) => {
        const validations = getValidationsForNode(derived, nodeId, mask, 'error');
        return validations.length > 0;
      });
    });
  };
}
