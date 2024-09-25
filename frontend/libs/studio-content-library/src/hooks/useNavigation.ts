import { useState } from 'react';
import { QueryParamsRouterImpl } from '../utils/router/QueryParamsRouter';
import { Page } from '../types';

type UseNavigationResult = {
  navigate: (page: Page) => void;
  currentPage: string;
};

export const useNavigation = (): UseNavigationResult => {
  const router = QueryParamsRouterImpl.getInstance();
  const [currentPage, setCurrentPage] = useState<Page>(router.getCurrentRoute());

  const navigate = (page: Page): void => {
    router.navigate(page);
    setCurrentPage(page);
  };

  return {
    navigate,
    currentPage,
  };
};
