export interface InstanceDTO {
  id: string;
  instanceOwner: InstanceOwner;
  appId: string;
  org: string;
  selfLinks: SelfLinks;
  dueBefore: string | null;
  visibleAfter: string | null;
  process: Process;
  status: Status;
  completeConfirmations: unknown | null;
  data: DataItem[];
  presentationTexts: unknown | null;
  dataValues: unknown | null;
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
}

export interface InstanceOwner {
  partyId: string;
  personNumber: string;
  organisationNumber: string | null;
  username: string | null;
}

export interface SelfLinks {
  apps: string;
  platform: string;
}

export interface Process {
  started: string;
  startEvent: string;
  currentTask: CurrentTask;
  ended: string | null;
  endEvent: string | null;
}

export interface CurrentTask {
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended: string | null;
  validated: string | null;
  flowType: string;
}

export interface Status {
  isArchived: boolean;
  archived: string | null;
  isSoftDeleted: boolean;
  softDeleted: string | null;
  isHardDeleted: boolean;
  hardDeleted: string | null;
  readStatus: number;
  substatus: string | null;
}

export interface DataItem {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename: string | null;
  contentType: string;
  blobStoragePath: string;
  selfLinks: SelfLinks;
  size: number;
  contentHash: string | null;
  locked: boolean;
  refs: unknown | null;
  isRead: boolean;
  tags: string[];
  userDefinedMetadata: unknown | null;
  metadata: unknown | null;
  deleteStatus: unknown | null;
  fileScanResult: string;
  references: unknown | null;
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
}
