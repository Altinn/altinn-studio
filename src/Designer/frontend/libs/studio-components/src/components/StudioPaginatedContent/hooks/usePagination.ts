import { type ReactNode, useState, useMemo } from 'react';
import { type StudioPaginatedNavigation } from '../types/StudioPaginatedNavigation';
import { type StudioPaginatedItem } from '../types/StudioPaginatedItem';

export const usePagination = (
  items: StudioPaginatedItem[],
): { currentPage: number; pages: ReactNode[]; navigation: StudioPaginatedNavigation } => {
  const [currentPageState, setCurrentPageState] = useState<number>(0);

  const validationRules = useMemo<boolean[]>(() => mapItemsToValidationRules(items), [items]);
  const pages = useMemo<ReactNode[]>(() => mapItemsToPages(items), [items]);

  const totalItems = items.length;
  const currentPage = Math.min(currentPageState, Math.max(0, totalItems - 1));

  const hasPreviousPage: boolean = currentPage > 0;
  const hasNextPage: boolean = currentPage < totalItems - 1;
  const canGoToNextPage: boolean = hasNextPage && !!validationRules[currentPage];

  const goNext = (): void => {
    if (canGoToNextPage) setCurrentPageState((current: number) => current + 1);
  };

  const goPrevious = (): void => {
    if (hasPreviousPage) setCurrentPageState((current: number) => current - 1);
  };

  const navigation: StudioPaginatedNavigation = {
    canGoNext: canGoToNextPage,
    canGoPrevious: hasPreviousPage,
    onNext: goNext,
    onPrevious: goPrevious,
  };
  return { currentPage, pages, navigation };
};

const mapItemsToValidationRules = (items: StudioPaginatedItem[]): boolean[] =>
  items.map((item: StudioPaginatedItem) => item?.validationRuleForNextButton ?? true);

const mapItemsToPages = (items: StudioPaginatedItem[]): ReactNode[] =>
  items.map((item: StudioPaginatedItem) => item.pageContent);
