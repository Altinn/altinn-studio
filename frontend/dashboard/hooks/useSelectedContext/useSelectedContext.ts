import { useParams } from 'react-router-dom';
import { SelectedContextType } from 'dashboard/context/HeaderContext';

export const useSelectedContext = () => {
  const { selectedContext = SelectedContextType.Self } = useParams();
  return selectedContext;
};
