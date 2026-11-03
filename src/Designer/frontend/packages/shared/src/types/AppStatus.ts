import type { StatusOption } from 'app-shared/types/ApplicationMetadata';

export type BuildAppStatus = Extract<StatusOption, 'UnderDevelopment' | 'Completed'>;

export const buildAppStatuses: readonly BuildAppStatus[] = ['UnderDevelopment', 'Completed'];

export const isBuildAppStatus = (status: StatusOption | undefined): status is BuildAppStatus =>
  buildAppStatuses.includes(status as BuildAppStatus);
