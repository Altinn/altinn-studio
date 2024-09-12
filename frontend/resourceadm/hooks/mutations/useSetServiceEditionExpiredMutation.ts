import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

/**
 * Mutation to set Altinn 2 service expired
 *
 * @param org the organisation of the user
 * @param serviceCode serviceCode of the Altinn 2 service
 * @param serviceEditionCode serviceEditionCode of the Altinn 2 service
 * @param env the chosen environment
 */
export const useSetServiceEditionExpiredMutation = (
  org: string,
  serviceCode: string,
  serviceEditionCode: string,
  env: string,
) => {
  const { setServiceEditionExpired } = useServicesContext();

  return useMutation({
    mutationFn: () => setServiceEditionExpired(org, serviceCode, serviceEditionCode, env),
  });
};
