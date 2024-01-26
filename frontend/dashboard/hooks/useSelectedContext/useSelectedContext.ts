import { useParams } from 'react-router-dom';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

export const useSelectedContext = () => {
  const { selectedContext = SelectedContextType.Self } = useParams();
  return selectedContext;
};
