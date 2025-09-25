import { type ReactNode, useState } from 'react';
import { type StudioPaginatedNavigation } from '../types/StudioPaginatedNavigation';
import { type StudioPaginatedItem } from '../types/StudioPaginatedItem';

export const usePagination = (
  items: StudioPaginatedItem[],
): { currentPage: number; pages: ReactNode[]; navigation: StudioPaginatedNavigation } => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const hasPreviousPage: boolean = currentPage > 0;
  const hasNextPage: boolean = currentPage < items.length - 1;
  const validationRules: boolean[] = mapItemsToValidationRules(items);
  const pages: ReactNode[] = mapItemsToPages(items);
  const canGoToNextPage: boolean = validationRules[currentPage] && hasNextPage;

  const goNext = (): void => {
    if (canGoToNextPage) setCurrentPage((current: number) => current + 1);
  };

  const goPrevious = (): void => {
    if (hasPreviousPage) setCurrentPage((current: number) => current - 1);
  };

  const navigation: StudioPaginatedNavigation = {
    canGoNext: canGoToNextPage,
    canGoPrevious: hasPreviousPage,
    onNext: goNext,
    onPrevious: goPrevious,
  };
  return { currentPage, pages, navigation };
};

const mapItemsToValidationRules = (items: StudioPaginatedItem[]): boolean[] => {
  return items.map((item: StudioPaginatedItem) => item?.validationRuleForNextButton ?? true);
};

const mapItemsToPages = (items: StudioPaginatedItem[]): ReactNode[] => {
  return items.map((item: StudioPaginatedItem) => item.pageContent);
};
