import type { FileScanResult } from 'src/features/attachments/types';
import type { LooseAutocomplete } from 'src/types';

export interface IAltinnOrg {
  name: ITitle;
  logo: string;
  orgnr: string;
  homepage: string;
  environments: string[];
}

export interface IApplicationLogic {
  allowAnonymousOnStateless?: boolean | null;
  autoCreate?: boolean | null;
  classRef?: string | null;
  schemaRef?: string | null;
  disallowUserCreate?: boolean | null;
}

export interface IDisplayAttachment {
  name?: string;
  iconClass: string;
  grouping: string | undefined;
  description: Partial<Record<LooseAutocomplete<'en' | 'nb' | 'nn'>, string>> | undefined;
  url?: string;
  dataType: string;
  tags?: string[];
}

export interface IData {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename?: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks?: ISelfLinks;
  size: number;
  locked: boolean;
  refs: string[];
  isRead?: boolean;
  tags?: string[];
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
  contentHash?: unknown;
  fileScanResult?: FileScanResult;
  fileScanDetails?: string;
}

export interface IDataType {
  id: string;
  description?: Partial<Record<LooseAutocomplete<'en' | 'nb' | 'nn'>, string>> | null;
  allowedContentTypes: string[] | null;
  allowedContributers?: string[] | null;
  allowedContributors?: string[] | null;
  appLogic?: IApplicationLogic | null;
  taskId?: string | null;
  maxSize?: number | null;
  maxCount: number;
  minCount: number;
  grouping?: string | null;
}

export interface IInstance {
  appId: string;
  created?: string;
  createdBy?: string;
  data: IData[];
  dueBefore?: string;
  id: string;
  instanceOwner: IInstanceOwner;
  instanceState?: IInstanceState;
  lastChanged?: string;
  lastChangedBy?: string;
  org: string;
  selfLinks?: ISelfLinks | null;
  status?: IInstanceStatus | null;
  title?: ITitle | null;
  visibleAfter?: string;
  process?: IProcess;
  completeConfirmations?: unknown;
  presentationTexts?: unknown;
  dataValues?: unknown;
}

export interface IInstanceStatus {
  substatus: ISubstatus;
}

export interface ISubstatus {
  label: string;
  description: string;
}

export interface IInstanceOwner {
  partyId: string;
  personNumber?: string;
  organisationNumber?: string | null;
  username?: string;
  party?: IParty | null;
}

export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

// Language for the rendered altinn app
export interface IAppLanguage {
  language: string; // Language code
}

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Organization.cs
 */
export interface IOrganisation {
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
}

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Party.cs
 */
export interface IParty {
  partyId: number;
  partyUuid?: string | null;
  partyTypeName: PartyType;
  orgNumber?: string | null;
  ssn: string | null;
  unitType?: string | null;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  person?: IPerson | null;
  organization?: IOrganisation | null;
  childParties?: IParty[] | null;
}

/**
 * @see https://github.com/Altinn/altinn-register/blob/main/src/Altinn.Platform.Models/src/Altinn.Platform.Models/Register/PartyType.cs
 */
export enum PartyType {
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

export interface IPerson {
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
}

export interface IProcess {
  started: string;
  startEvent?: string | null;
  currentTask?: ITask;
  ended?: string | null;
  endEvent?: string | null;
  processTasks?: IProcessTask[];
  /**
   * Live workflow-engine annotation resolved on every process/instance read. It sits next to the
   * (unchanged) committed `currentTask`: `idle` means render normally, `processing` means a
   * transition is in flight, and `failed` means the transition failed terminally and awaits an
   * ops-driven resume. Optional so older backends that don't emit it are treated as `idle`.
   */
  workflow?: IProcessWorkflow;
}

export type WorkflowActivityStatus = 'idle' | 'processing' | 'failed';

/**
 * Safe structured facts about a failed transition - the coarse classification plus the
 * support-reference fields. The backend never ships raw error detail here.
 */
export interface IProcessWorkflowFailure {
  kind?: string;
  /** Id of the failed workflow - the support reference ops can look up in the engine. */
  workflowId?: string;
  /** When the failure was recorded (ISO timestamp). */
  occurredAt?: string;
}

export interface IProcessWorkflow {
  status: WorkflowActivityStatus;
  /** BPMN element id the in-flight/failed transition targets. Omitted when idle or unresolved. */
  targetTask?: string;
  /**
   * True when the transition is parked between automatic retry attempts (a previous attempt
   * failed and the engine will retry). Only present while status === 'processing'; purely a
   * presentation hint for explaining a long wait honestly. Omitted when false.
   */
  retrying?: boolean;
  /**
   * Progress through the in-flight transition's workflow steps (execution is on step
   * `completed + 1` of `total`). Only present while status === 'processing' and the engine
   * reported step counts; presentation-only.
   */
  progress?: IProcessWorkflowProgress;
  /** Present only when status === 'failed'. */
  failure?: IProcessWorkflowFailure;
}

export interface IProcessWorkflowProgress {
  completed: number;
  total: number;
}

export interface IProfile {
  userId: number;
  userName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phoneNumber?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  email?: any;
  partyId: number;
  party?: IParty;
  userType: number;
  profileSettingPreference: IProfileSettingPreference;
}

export interface IProfileSettingPreference {
  language: string | null;
  preSelectedPartyId: number;
  doNotPromptForParty: boolean;
}

export interface ISelfLinks {
  apps: string;
  platform: string;
}

export interface IUserAction {
  id: IActionType | string;
  authorized: boolean;
  type: 'ProcessAction' | 'ServerAction';
}

export const ELEMENT_TYPE = {
  SERVICE_TASK: 'ServiceTask',
  TASK: 'Task',
} as const;

type ElementType = (typeof ELEMENT_TYPE)[keyof typeof ELEMENT_TYPE];

interface IProcessTask {
  altinnTaskType: string;
  elementId: string;
  elementType?: ElementType; // Appears in versions after https://github.com/Altinn/app-lib-dotnet/pull/745
}

export interface ITask extends IProcessTask {
  flow: number;
  started: string;
  name: string;
  ended?: string | null;
  validated?: IValidated | null;

  read?: boolean | null;
  write?: boolean | null;
  actions?: IProcessActions | null;
  userActions?: IUserAction[];
}

export type IProcessActions = {
  [k in IActionType]?: boolean;
};

export interface ITitle {
  [key: string]: string;
}

export interface IValidated {
  timestamp: string;
  canCompleteTask: boolean;
}

export interface ITextResource {
  value: string;
  variables?: IVariable[];
}

export interface IVariable {
  key: string;
  dataSource:
    | 'instanceContext'
    | 'applicationSettings'
    | 'dataModel.default'
    | `dataModel.${string}`
    | 'customTextParameters';
  defaultValue?: string;
}

export interface IApplicationSettings {
  [source: string]: string | undefined;
}

export interface IPlatformFrontendSettings {
  altinnLogoUrl: string;
  helpCircleIllustrationUrl: string;
  postalCodesUrl: string;
}

export type InstanceOwnerPartyType = 'unknown' | 'org' | 'person' | 'selfIdentified';

/** Describes an object with key values from current instance to be used in texts. */
export interface IInstanceDataSources {
  instanceId: string;
  appId: string;
  instanceOwnerPartyId: string;
  instanceOwnerPartyType: InstanceOwnerPartyType;
  instanceOwnerName?: string;
}

export type IActionType = 'instantiate' | 'confirm' | 'sign' | 'reject' | 'read' | 'write' | 'complete';

export type IAuthContext = {
  read: boolean;
  write: boolean;
} & { [action in IActionType]: boolean };

export type ProblemDetails = {
  title: string;
  detail: string;
  status: number;
};

export interface PostalCodesRegistry {
  places: (string | null)[];
  mapping: number[];
}
