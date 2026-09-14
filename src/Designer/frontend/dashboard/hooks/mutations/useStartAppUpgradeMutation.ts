import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useStartAppUpgradeMutation = (org: string, app: string) => {
  const { startAppUpgrade } = useServicesContext();
  return useMutation({
    mutationFn: () => startAppUpgrade(org, app),
    meta: { hideDefaultError: true },
  });
};
