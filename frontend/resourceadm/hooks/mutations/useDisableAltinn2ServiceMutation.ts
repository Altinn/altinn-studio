import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

/**
 * Mutation to disable migration for Altinn 2 service
 *
 * @param org the organisation of the user
 * @param serviceCode serviceCode of the Altinn 2 service
 * @param serviceEditionCode serviceEditionCode of the Altinn 2 service
 * @param env the chosen environment
 */
export const useDisableAltinn2ServiceMutation = (
  org: string,
  serviceCode: string,
  serviceEditionCode: string,
  env: string,
) => {
  const { disableAltinn2Service } = useServicesContext();

  return useMutation({
    mutationFn: () => disableAltinn2Service(org, serviceCode, serviceEditionCode, env),
  });
};
