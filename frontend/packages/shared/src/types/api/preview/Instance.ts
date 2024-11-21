import type { KeyValuePairs } from '../../KeyValuePairs';

export type Instance = {
  id: string;
  instanceOwner: InstanceOwner;
  appId: string;
  org: string;
  process: ProcessState;
  status: InstanceStatus;
  data: DataElement[];
};

type InstanceOwner = {
  partyId: string;
  personNumber: string;
  organisationNumber: string;
  username: string;
};

type ProcessState = {
  started?: Date;
  startEvent: string;
  currentTask: ProcessElementInfo;
  ended?: Date;
  endEvent: string;
};

type ProcessElementInfo = {
  flow?: number;
  started?: Date;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended?: Date;
  validated: ValidationStatus;
  flowType: string;
};

type ValidationStatus = {
  timestamp?: Date;
  canCompleteTask: boolean;
};

type InstanceStatus = {
  isArchived: Boolean;
  archived?: Date;
  isSoftDeleted: Boolean;
  softDeleted?: Date;
  isHardDeleted: Boolean;
  hardDeleted?: Date;
  readStatus: ReadStatus;
  substatus: Substatus;
};

type ReadStatus = 'unread' | 'read' | 'updatedSinceLastView';
type Substatus = {
  label: string;
  description: string;
};

type DataElement = {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks: ResourceLinks;
  size: number;
  contentHash: string;
  locked: boolean;
  refs: string[];
  isRead: boolean;
  tags: string[];
  userDefinedMetadata: KeyValuePairs[];
  metadata: KeyValuePairs[];
  deleteStatus: DeleteStatus;
  fileScanResult: FileScanResult;
  references: Reference[];
};

type ResourceLinks = {
  apps: string;
  platform: string;
};

type DeleteStatus = {
  isHardDeleted: boolean;
  hardDeleted?: Date;
};

type FileScanResult = 'notApplicable' | 'pending' | 'clean' | 'infected';

type Reference = {
  value: string;
  relation: string;
  valueType: string;
};
