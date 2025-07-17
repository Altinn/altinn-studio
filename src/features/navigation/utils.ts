import { useMemo } from 'react';

import {
  CardIcon,
  FolderIcon,
  PencilLineIcon,
  ReceiptIcon,
  SealCheckmarkIcon,
  TasklistIcon,
} from '@navikt/aksel-icons';

import { ContextNotProvided } from 'src/core/contexts/context';
import { usePageGroups, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useGetAltinnTaskType } from 'src/features/instance/useProcessQuery';
import { ValidationMask } from 'src/features/validation';
import { useIsReceiptPage } from 'src/hooks/navigation';
import { useVisitedPages } from 'src/hooks/useNavigatePage';
import { useHiddenPages } from 'src/utils/layout/hidden';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type {
  NavigationPageGroup,
  NavigationPageGroupSingle,
  NavigationReceipt,
  NavigationTask,
} from 'src/layout/common.generated';

export function useHasGroupedNavigation() {
  const pageGroups = usePageGroups();
  const taskGroups = usePageSettings().taskNavigation;
  const isReceiptPage = useIsReceiptPage();
  return !isReceiptPage && (pageGroups || taskGroups.length);
}

export const SIDEBAR_BREAKPOINT = 1341;

export function isSingleGroup(group: NavigationPageGroup): group is NavigationPageGroupSingle {
  return group.order.length === 1;
}

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
  const validationsSelector = NodesInternal.useLaxValidationsSelector();
  const [visitedPages] = useVisitedPages();

  const allNodeIds = NodesInternal.useLaxMemoSelector((state) => {
    const allNodeIds = Object.fromEntries<string[]>(order.map((page) => [page, []]));
    Object.values(state.nodeData).forEach((node) => allNodeIds[node.pageKey]?.push(node.id));
    return allNodeIds;
  });

  const isCompleted = useMemo(() => {
    if (allNodeIds === ContextNotProvided) {
      return ContextNotProvided;
    }

    if (!shouldMarkWhenCompleted) {
      return { group: false, pages: Object.fromEntries(order.map((page) => [page, false])) };
    }

    const pageHasNoErrors = Object.fromEntries(
      order.map((page) => [
        page,
        allNodeIds[page].every((nodeId) => {
          const allValidations = validationsSelector(nodeId, ValidationMask.All, 'error');
          return allValidations !== ContextNotProvided && allValidations.length === 0;
        }),
      ]),
    );

    const completedPages = Object.fromEntries(
      order.map((page) => [page, pageHasNoErrors[page] && visitedPages.includes(page)]),
    );

    const groupIsComplete = order.every((page) => pageHasNoErrors[page] && visitedPages.includes(page));

    return { pages: completedPages, group: groupIsComplete };
  }, [order, allNodeIds, validationsSelector, shouldMarkWhenCompleted, visitedPages]);

  const hasErrors = useMemo(() => {
    if (allNodeIds === ContextNotProvided) {
      return ContextNotProvided;
    }

    const pageHasErrors = Object.fromEntries(
      order.map((page) => [
        page,
        allNodeIds[page].some((nodeId) => {
          const visibleValidations = validationsSelector(nodeId, 'visible', 'error');
          return visibleValidations !== ContextNotProvided && visibleValidations.length > 0;
        }),
      ]),
    );

    const groupHasErrors = Object.values(pageHasErrors).some((p) => p);

    return { pages: pageHasErrors, group: groupHasErrors };
  }, [order, allNodeIds, validationsSelector]);

  if (isCompleted === ContextNotProvided || hasErrors === ContextNotProvided) {
    return ContextNotProvided;
  }

  return { isCompleted, hasErrors };
}
