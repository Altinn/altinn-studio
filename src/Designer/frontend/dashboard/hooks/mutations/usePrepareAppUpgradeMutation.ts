import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const usePrepareAppUpgradeMutation = (org: string, app: string) => {
  const { prepareAppUpgrade } = useServicesContext();
  return useMutation({
    mutationFn: () => prepareAppUpgrade(org, app),
    meta: { hideDefaultError: true },
  });
};
