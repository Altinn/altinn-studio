export type SimpleInstance = {
  id: string;
  org: string;
  app: string;
  currentTask?: string;
  dueBefore?: string;
  isComplete: boolean;
  completedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  isSoftDeleted: boolean;
  softDeletedAt?: string;
  isHardDeleted: boolean;
  hardDeletedAt?: string;
  isConfirmed: boolean;
  confirmedAt?: string;
  createdAt?: string;
  lastChangedAt?: string;
};
