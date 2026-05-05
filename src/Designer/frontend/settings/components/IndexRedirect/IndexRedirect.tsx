import { Navigate } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';

export const IndexRedirect = () => {
  const { data: user } = useUserQuery();
  if (!user) return null;
  return <Navigate to={user.login} replace />;
};
