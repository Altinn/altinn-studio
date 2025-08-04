import { useLocation } from 'react-router-dom';

export const useLayoutSetNavigation = () => {
  const location = useLocation();

  const getLayoutSetPath = (layoutSetId: string): string => {
    if (location.pathname.includes('/layoutSet/')) {
      return `../layoutSet/${layoutSetId}`;
    }
    return `layoutSet/${layoutSetId}`;
  };

  return { getLayoutSetPath };
};
