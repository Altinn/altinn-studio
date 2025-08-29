import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { userLogoutAfterPath } from 'app-shared/api/paths';

export const useLogoutMutation = () => {
  const { logout } = useServicesContext();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: async () => {
      window.location.assign(userLogoutAfterPath());
    },
  });
};
