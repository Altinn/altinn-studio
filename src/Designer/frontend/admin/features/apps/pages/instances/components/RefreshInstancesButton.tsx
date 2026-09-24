import type { ReactElement } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { StudioButton, StudioSpinner } from '@studio/components';
import { ArrowsCirclepathIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { QueryKey } from 'app-shared/types/QueryKey';

export type RefreshInstancesButtonProps = {
  org: string;
  environment: string;
  app: string;
};

/**
 * Reads the instance lists again now — the Storage list, its health column and the problems list
 * — for the operator who does not want to wait for the next scheduled read.
 */
export const RefreshInstancesButton = ({
  org,
  environment,
  app,
}: RefreshInstancesButtonProps): ReactElement => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isFetching =
    useIsFetching({ queryKey: [QueryKey.AppInstances, org, environment, app] }) > 0;

  const refresh = () =>
    Promise.all(
      [
        QueryKey.AppInstances,
        QueryKey.AppInstancesWorkflowHealth,
        QueryKey.AppWorkflowProblems,
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key, org, environment, app] })),
    );

  return (
    <StudioButton
      variant='tertiary'
      icon={
        isFetching ? (
          <StudioSpinner aria-hidden='true' />
        ) : (
          <ArrowsCirclepathIcon aria-hidden='true' />
        )
      }
      disabled={isFetching}
      onClick={refresh}
    >
      {t('admin.instances.refresh')}
    </StudioButton>
  );
};
