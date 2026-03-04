import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation } from '@tanstack/react-query';

export const useDeleteUserKeyMutation = () => {
  const { deleteUserKey } = useServicesContext();
  return useMutation({
    mutationFn: (userKey: string) => deleteUserKey(userKey),
  });
};
