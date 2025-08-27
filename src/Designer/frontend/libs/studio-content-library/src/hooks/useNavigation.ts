import { useState } from 'react';
import { QueryParamsRouterImpl } from '../utils/router/QueryParamsRouter';
import type { PageName } from '../types/PageName';

type UseNavigationResult = {
  navigate: (page: PageName) => void;
  currentPage: PageName;
};

export const useNavigation = (): UseNavigationResult => {
  const router = QueryParamsRouterImpl.getInstance();
  const [currentPage, setCurrentPage] = useState<PageName>(router.currentRoute);

  const navigate = (page: PageName): void => {
    router.navigate(page);
    setCurrentPage(page);
  };

  return {
    navigate,
    currentPage,
  };
};
