import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateBotAccountTeamsMutation = (org: string, botAccountId: string) => {
  const { updateBotAccountTeams } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deployEnvironments: string[]) => updateBotAccountTeams(org, botAccountId, deployEnvironments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BotAccounts, org] });
    },
  });
};
