export type Instance = {
  appId: string;
  created?: string;
  createdBy?: string;
  data: InstanceData[];
  dueBefore?: string;
  id: string;
  instanceOwner: InstanceOwner;
  instanceState?: InstanceState;
  lastChanged?: string;
  lastChangedBy?: string;
  org: string;
  selfLinks?: SelfLinks | null;
  status?: InstanceStatus | null;
  title?: Title | null;
  visibleAfter?: string;
  process: Process;
  completeConfirmations?: CompleteConfirmation[];
  presentationTexts?: Record<string, string>;
  dataValues?: Record<string, string>;
};

type CompleteConfirmation = {
  stakeholderId: string;
  confirmedOn: string;
};

type InstanceData = {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename?: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks?: SelfLinks;
  size: number;
  locked: boolean;
  refs: string[];
  isRead?: boolean;
  tags?: string[];
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
  contentHash?: string;
  fileScanResult?: FileScanResult;
  fileScanDetails?: string;
};

type FileScanResult = 'NotApplicable' | 'Pending' | 'Clean' | 'Infected';

type InstanceStatus = {
  substatus: Substatus;
};

type Substatus = {
  label: string;
  description: string;
};

type InstanceOwner = {
  partyId: string;
  personNumber?: string;
  organisationNumber?: string | null;
  username?: string;
  party?: Party | null;
};

type InstanceState = {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
};

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Organization.cs
 */
type Organisation = {
  orgNumber: string;
  name: string;
  unitType: string;
  telephoneNumber: string;
  mobileNumber: string;
  faxNumber: string;
  emailAddress: string;
  internetAddress: string;
  mailingAddress: string;
  mailingPostalCode: string;
  mailingPostalCity: string;
  businessPostalCode: string;
  businessPostalCity: string;
  // unitStatus: string; // This exists in the model but is not clearly defined, and not used in the frontend
};

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Party.cs
 */
type Party = {
  partyId: number;
  partyUuid?: string | null;
  partyTypeName: PartyType;
  orgNumber?: string | null;
  ssn: string | null;
  unitType?: string | null;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  person?: Person | null;
  organization?: Organisation | null;
  childParties?: Party[] | null;
};

/**
 * @see https://github.com/Altinn/altinn-register/blob/main/src/Altinn.Platform.Models/src/Altinn.Platform.Models/Register/PartyType.cs
 */
enum PartyType {
  Person = 1,
  Organisation = 2,

  /**
   * Commenting these out so nobody uses them by accident. The enum linked above has
   * these values, but their existence seem to be a lie:
   * @see https://digdir.slack.com/archives/C079ZFUSFMW/p1738771291616989?thread_ts=1738750152.285599&cid=C079ZFUSFMW
   */
  // SubUnit = 4,
  SelfIdentified = 3,
  // BankruptcyEstate = 5,
}

type Person = {
  ssn: string;
  name: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  telephoneNumber: string;
  mobileNumber: string;
  mailingAddress: string;
  mailingPostalCode: number;
  mailingPostalCity: string;
  addressMunicipalNumber: number;
  addressMunicipalName: string;
  addressStreetName: string;
  addressHouseNumber: number;
  addressHouseLetter: string | null;
  addressPostalCode: number;
  addressCity: string;
};

type Process = {
  started: string;
  startEvent?: string | null;
  currentTask?: Task;
  ended?: string | null;
  endEvent?: string | null;
  processTasks?: Pick<Task, 'altinnTaskType' | 'elementId'>[];
};

type UserAction = {
  id: ActionType | string;
  authorized: boolean;
  type: 'ProcessAction' | 'ServerAction';
};

type Task = {
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended?: string | null;
  validated?: Validated | null;

  read?: boolean | null;
  write?: boolean | null;
  actions?: ProcessActions | null;
  userActions?: UserAction[];
};

type ActionType = 'instantiate' | 'confirm' | 'sign' | 'reject' | 'read' | 'write' | 'complete';

type ProcessActions = {
  [k in ActionType]?: boolean;
};

type Validated = {
  timestamp: string;
  canCompleteTask: boolean;
};

type SelfLinks = {
  apps: string;
  platform: string;
};

type Title = {
  [key: string]: string;
};
