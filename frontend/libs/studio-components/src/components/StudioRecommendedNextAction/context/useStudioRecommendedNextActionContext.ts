import { StudioRecommendedNextActionContext } from './StudioRecommendedNextActionContext';
import { useContext } from 'react';

export const useStudioRecommendedNextActionContext = () => {
  const context = useContext(StudioRecommendedNextActionContext);
  if (!context) {
    throw new Error(
      'useStudioRecommendedNextActionContext must be used within a StudioRecommendedNextActionProvider',
    );
  }
  return context;
};
