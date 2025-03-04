import { useParams } from 'react-router-dom';
import { SelectedContextType } from '../../enums/SelectedContextType';

export const useSelectedContext = () => {
  const { selectedContext = SelectedContextType.None } = useParams();
  return selectedContext;
};
