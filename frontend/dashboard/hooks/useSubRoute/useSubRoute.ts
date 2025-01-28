import { useParams } from 'react-router-dom';
import { SubRoute } from '../../context/HeaderContext';

export const useSubRoute = () => {
  const { subRoute = SubRoute.AppDashboard } = useParams();
  return subRoute;
};
