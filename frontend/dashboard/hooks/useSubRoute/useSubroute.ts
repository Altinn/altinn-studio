import { useParams } from 'react-router-dom';
import { Subroute } from '../../context/HeaderContext';

export const useSubroute = () => {
  const { subroute = Subroute.AppDashboard } = useParams();
  return subroute;
};
