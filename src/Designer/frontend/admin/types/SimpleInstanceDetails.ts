import type { SimpleInstance } from './InstancesResponse';

export type SimpleInstanceDetails = SimpleInstance & {
  data?: SimpleDataElement[];
};

export type SimpleDataElement = {
  id: string;
  dataType: string;
  contentType: string;
  size: number;
  locked: boolean;
  isRead: boolean;
  fileScanResult?: FileScanResult;
  hardDeletedAt?: string;
  createdAt?: string;
  lastChangedAt?: string;
};

type FileScanResult = 'NotApplicable' | 'Pending' | 'Clean' | 'Infected';
