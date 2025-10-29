export type InstancesResponse = {
  instances: SimpleInstance[];
  continuationToken?: string;
};

export type SimpleInstance = {
  id: string;
  org: string;
  app: string;
  isRead: boolean;
  currentTaskName?: string;
  currentTaskId?: string;
  dueBefore?: string;
  archivedAt?: string;
  softDeletedAt?: string;
  hardDeletedAt?: string;
  confirmedAt?: string;
  createdAt?: string;
  lastChangedAt?: string;
};
