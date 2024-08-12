import { useParams } from 'react-router-dom';
import { SelectedContextType } from 'app-shared/enums/SelectedContextType';

export const useSelectedContext = () => {
  const { selectedContext = SelectedContextType.None } = useParams();
  return selectedContext;
};
