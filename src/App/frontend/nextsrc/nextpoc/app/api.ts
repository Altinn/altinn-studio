/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** @format int32 */
export enum ValidationIssueSeverity {
  Value0 = 0,
  Value1 = 1,
  Value2 = 2,
  Value3 = 3,
  Value4 = 4,
  Value5 = 5,
}

/** @format int32 */
export enum UserType {
  Value0 = 0,
  Value1 = 1,
  Value2 = 2,
  Value3 = 3,
  Value4 = 4,
  Value5 = 5,
  Value6 = 6,
}

export enum RelationType {
  GeneratedFrom = "GeneratedFrom",
}

export enum ReferenceType {
  DataElement = "DataElement",
  Task = "Task",
}

/** @format int32 */
export enum ReadStatus {
  Value0 = 0,
  Value1 = 1,
  Value2 = 2,
}

export enum PaymentStatus {
  Uninitialized = "Uninitialized",
  Created = "Created",
  Paid = "Paid",
  Failed = "Failed",
  Cancelled = "Cancelled",
  Skipped = "Skipped",
}

export enum PayerType {
  Person = "Person",
  Company = "Company",
}

/** @format int32 */
export enum PartyType {
  Value1 = 1,
  Value2 = 2,
  Value3 = 3,
  Value4 = 4,
  Value5 = 5,
}

export enum OperationType {
  Unknown = "Unknown",
  Add = "add",
  Remove = "remove",
  Replace = "replace",
  Move = "move",
  Copy = "copy",
  Test = "test",
}

/** Represents the state of a notification. */
export enum NotificationStatus {
  NotSent = "NotSent",
  Sent = "Sent",
  Failed = "Failed",
}

export enum FileScanResult {
  NotApplicable = "NotApplicable",
  Pending = "Pending",
  Clean = "Clean",
  Infected = "Infected",
}

/** @format int32 */
export enum ActionType {
  Value0 = 0,
  Value1 = 1,
}

export interface ActionError {
  code?: string | null;
  message?: string | null;
  metadata?: Record<string, string>;
}

export interface Address {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface ApiScopes {
  read?: string | null;
  write?: string | null;
  errorMessageTextResourceKey?: string | null;
}

export interface ApiScopesConfiguration {
  users?: ApiScopes;
  serviceOwners?: ApiScopes;
  errorMessageTextResourceKey?: string | null;
}

export interface AppProcessElementInfo {
  /** @format int32 */
  flow?: number | null;
  /** @format date-time */
  started?: string | null;
  elementId?: string | null;
  name?: string | null;
  altinnTaskType?: string | null;
  /** @format date-time */
  ended?: string | null;
  validated?: ValidationStatus;
  flowType?: string | null;
  actions?: Record<string, boolean>;
  userActions?: UserAction[] | null;
  read?: boolean;
  write?: boolean;
  elementType?: string | null;
}

export interface AppProcessState {
  /** @format date-time */
  started?: string | null;
  startEvent?: string | null;
  currentTask?: AppProcessElementInfo;
  /** @format date-time */
  ended?: string | null;
  endEvent?: string | null;
  processTasks?: AppProcessTaskTypeInfo[] | null;
}

export interface AppProcessTaskTypeInfo {
  altinnTaskType?: string | null;
  elementId?: string | null;
  elementType?: string | null;
}

export interface ApplicationLanguage {
  language?: string | null;
}

export interface ApplicationLogic {
  autoCreate?: boolean | null;
  classRef?: string | null;
  schemaRef?: string | null;
  allowAnonymousOnStateless?: boolean;
  autoDeleteOnProcessEnd?: boolean;
  disallowUserCreate?: boolean;
  disallowUserDelete?: boolean;
  /** @deprecated */
  allowInSubform?: boolean;
  shadowFields?: ShadowFields;
}

export interface ApplicationMetadata {
  /** @format date-time */
  created?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  lastChanged?: string | null;
  lastChangedBy?: string | null;
  versionId?: string | null;
  org?: string | null;
  title?: Record<string, string | null>;
  /** @format date-time */
  validFrom?: string | null;
  /** @format date-time */
  validTo?: string | null;
  processId?: string | null;
  dataTypes?: DataType[] | null;
  partyTypesAllowed?: PartyTypesAllowed;
  autoDeleteOnProcessEnd?: boolean;
  /** @format int32 */
  preventInstanceDeletionForDays?: number | null;
  presentationFields?: DataField[] | null;
  dataFields?: DataField[] | null;
  eFormidling?: EFormidlingContract;
  onEntry?: OnEntry;
  messageBoxConfig?: MessageBoxConfig;
  copyInstanceSettings?: CopyInstanceSettings;
  apiScopes?: ApiScopesConfiguration;
  /** @format int32 */
  storageAccountNumber?: number | null;
  disallowUserInstantiation?: boolean;
  id?: string | null;
  features?: Record<string, boolean>;
  logo?: Logo;
  altinnNugetVersion?: string | null;
  externalApiIds?: string[] | null;
  promptForParty?: string | null;
  [key: string]: any;
}

/** Represents the details of an authorized organization. */
export interface AuthorizedOrganizationDetails {
  /** The organization number. */
  orgNumber: string | null;
  /** The name of the organization. */
  orgName: string | null;
  /**
   * Gets or inits the ID of the party
   * @format int32
   */
  partyId: number;
}

export interface CalculationResult {
  /** @format date-time */
  created?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  lastChanged?: string | null;
  lastChangedBy?: string | null;
  id?: string | null;
  instanceGuid?: string | null;
  dataType?: string | null;
  filename?: string | null;
  contentType?: string | null;
  blobStoragePath?: string | null;
  selfLinks?: ResourceLinks;
  /** @format int64 */
  size?: number;
  contentHash?: string | null;
  locked?: boolean;
  refs?: string[] | null;
  isRead?: boolean;
  tags?: string[] | null;
  userDefinedMetadata?: KeyValueEntry[] | null;
  metadata?: KeyValueEntry[] | null;
  deleteStatus?: DeleteStatus;
  fileScanResult?: FileScanResult;
  references?: Reference[] | null;
  changedFields?: Record<string, any>;
}

export interface CardDetails {
  maskedPan?: string | null;
  expiryDate?: string | null;
}

export interface ClientAction {
  id?: string | null;
  metadata?: Record<string, any>;
}

export interface CloudEvent {
  id?: string | null;
  /** @format uri */
  source?: string | null;
  specversion?: string | null;
  type?: string | null;
  subject?: string | null;
  /** @format date-time */
  time?: string;
  alternativesubject?: string | null;
  data?: any;
  /** @format uri */
  dataschema?: string | null;
  contenttype?: ContentType;
}

export interface CompleteConfirmation {
  stakeholderId?: string | null;
  /** @format date-time */
  confirmedOn?: string;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}



// export interface ContentType {
//   boundary?: string | null;
//   charSet?: string | null;
//   mediaType?: string | null;
//   name?: string | null;
//   parameters?: any[] | null;
// }

export interface CopyInstanceSettings {
  enabled?: boolean;
  excludedDataTypes?: string[] | null;
  excludedDataFields?: string[] | null;
  includeAttachments?: boolean;
}

export interface DataElement {
  /** @format date-time */
  created?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  lastChanged?: string | null;
  lastChangedBy?: string | null;
  id?: string | null;
  instanceGuid?: string | null;
  dataType?: string | null;
  filename?: string | null;
  contentType?: string | null;
  blobStoragePath?: string | null;
  selfLinks?: ResourceLinks;
  /** @format int64 */
  size?: number;
  contentHash?: string | null;
  locked?: boolean;
  refs?: string[] | null;
  isRead?: boolean;
  tags?: string[] | null;
  userDefinedMetadata?: KeyValueEntry[] | null;
  metadata?: KeyValueEntry[] | null;
  deleteStatus?: DeleteStatus;
  fileScanResult?: FileScanResult;
  references?: Reference[] | null;
}

/** File scan result for an individual data element. */
export interface DataElementFileScanResult {
  /** Gets or sets the data element id */
  id?: string | null;
  fileScanResult?: FileScanResult;
}

export interface DataField {
  id?: string | null;
  path?: string | null;
  dataTypeId?: string | null;
}

/** Pair of Guid and data object. */
export interface DataModelPairResponse {
  /**
   * The guid of the DataElement
   * @format uuid
   */
  dataElementId: string;
  /** The form data of the data element */
  data: any;
}

/** Represents the request to patch data on the Altinn.App.Api.Controllers.DataController. */
export interface DataPatchRequest {
  patch: JsonPatch;
  /**
   * List of validators to ignore during the patch operation.
   * Issues from these validators will not be run during the save operation, but the validator will run on process/next
   */
  ignoredValidators?: string[] | null;
}

/**
 * Represents the request to patch data on the Altinn.App.Api.Controllers.DataController in the
 * version that supports multiple data models in the same request.
 */
export interface DataPatchRequestMultiple {
  /** The Patch operations to perform. */
  patches: PatchListItem[];
  /**
   * List of validators to ignore during the patch operation.
   * Issues from these validators will not be run during the save operation, but the validator will run on process/next
   */
  ignoredValidators?: string[] | null;
}

/** Represents the response from a data patch operation on the Altinn.App.Api.Controllers.DataController. */
export interface DataPatchResponse {
  /** The validation issues that were found during the patch operation. */
  validationIssues: Record<string, ValidationIssueWithSource[]>;
  /** The current data model after the patch operation. */
  newDataModel: any;
  instance: Instance;
}

/** Represents the response from a data patch operation on the Altinn.App.Api.Controllers.DataController. */
export interface DataPatchResponseMultiple {
  /** The validation issues that were found during the patch operation. */
  validationIssues: ValidationSourcePair[];
  /** The current data in all data models updated by the patch operation. */
  newDataModels: DataModelPairResponse[];
  instance: Instance;
}

/** Extension of ProblemDetails to include Validation issues from the file upload. */
export interface DataPostErrorResponse {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  /** List of the validators that reported to have relevant changes after a new data element was added */
  uploadValidationIssues: ValidationIssueWithSource[];
  [key: string]: any;
}

/** Response object for POST to /org/app/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataType} */
export interface DataPostResponse {
  /**
   * The Id of the created data element
   * @format uuid
   */
  newDataElementId: string;
  instance: Instance;
  /** List of validation issues that reported to have relevant changes after a new data element was added */
  validationIssues: ValidationSourcePair[];
  /** List of updated DataModels caused by dataProcessing */
  newDataModels: DataModelPairResponse[];
}

export interface DataType {
  id?: string | null;
  description?: Record<string, string>;
  allowedContentTypes?: string[] | null;
  /** @deprecated */
  allowedContributers?: string[] | null;
  allowedContributors?: string[] | null;
  actionRequiredToRead?: string | null;
  actionRequiredToWrite?: string | null;
  appLogic?: ApplicationLogic;
  taskId?: string | null;
  /** @format int32 */
  maxSize?: number | null;
  /**
   * @format int32
   * @default 1
   */
  maxCount?: number;
  /**
   * @format int32
   * @default 1
   */
  minCount?: number;
  grouping?: string | null;
  enablePdfCreation?: boolean;
  enableFileScan?: boolean;
  validationErrorOnPendingFileScan?: boolean;
  enabledFileAnalysers?: string[] | null;
  enabledFileValidators?: string[] | null;
  allowedKeysForUserDefinedMetadata?: string[] | null;
}

export interface DeleteStatus {
  isHardDeleted?: boolean;
  /** @format date-time */
  hardDeleted?: string | null;
}

export interface EFormidlingContract {
  serviceId?: string | null;
  dpfShipmentType?: string | null;
  receiver?: string | null;
  sendAfterTaskId?: string | null;
  process?: string | null;
  standard?: string | null;
  typeVersion?: string | null;
  type?: string | null;
  /** @format int32 */
  securityLevel?: number;
  dataTypes?: string[] | null;
}

export interface HideSettings {
  hideAlways?: boolean;
  hideOnTask?: string[] | null;
}

export interface Instance {
  /** @format date-time */
  created?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  lastChanged?: string | null;
  lastChangedBy?: string | null;
  id?: string | null;
  instanceOwner?: InstanceOwner;
  appId?: string | null;
  org?: string | null;
  selfLinks?: ResourceLinks;
  /** @format date-time */
  dueBefore?: string | null;
  /** @format date-time */
  visibleAfter?: string | null;
  process?: ProcessState;
  status?: InstanceStatus;
  completeConfirmations?: CompleteConfirmation[] | null;
  data?: DataElement[] | null;
  presentationTexts?: Record<string, string | null>;
  dataValues?: Record<string, string | null>;
}

/** Light weight model representing an instance and it's file scan result status. */
export interface InstanceFileScanResult {
  /** Instance id */
  id?: string | null;
  fileScanResult?: FileScanResult;
  /** File scan result for individual data elements. */
  data?: DataElementFileScanResult[] | null;
}

export interface InstanceOwner {
  partyId?: string | null;
  personNumber?: string | null;
  organisationNumber?: string | null;
  username?: string | null;
}

/** Represents information to identify the owner of an instance. */
export interface InstanceOwnerResponse {
  /** The party id of the instance owner (also called instance owner party id). */
  partyId: string | null;
  /** Person number (national identification number) of the party. Null if the party is not a person. */
  personNumber: string | null;
  /** The organisation number of the party. Null if the party is not an organisation. */
  organisationNumber: string | null;
  /** The username of the party. Null if the party is not self identified. */
  username: string | null;
  /** Class representing a party */
  party: PartyResponse;
}

/** Represents the response from an API endpoint providing a list of key-value properties. */
export interface InstanceResponse {
  /** The unique id of the instance {instanceOwnerId}/{instanceGuid}. */
  id: string | null;
  /** Represents information to identify the owner of an instance. */
  instanceOwner: InstanceOwnerResponse;
  /** The id of the application this is an instance of, e.g. {org}/{app22}. */
  appId: string | null;
  /** Application owner identifier, usually a abbreviation of organisation name. All in lower case. */
  org: string | null;
  selfLinks: ResourceLinks;
  /**
   * The due date to submit the instance to application owner.
   * @format date-time
   */
  dueBefore: string | null;
  /**
   * Date and time for when the instance should first become visible for the instance owner.
   * @format date-time
   */
  visibleAfter: string | null;
  process: ProcessState;
  status: InstanceStatus;
  /** A list of Altinn.Platform.Storage.Interface.Models.CompleteConfirmation elements. */
  completeConfirmations: CompleteConfirmation[] | null;
  /** A list of data elements associated with the instance */
  data: DataElement[] | null;
  /** The presentation texts for the instance. */
  presentationTexts: Record<string, string | null>;
  /** The data values for the instance. */
  dataValues: Record<string, string | null>;
  /**
   * The date and time for when the element was created.
   * @format date-time
   */
  created: string | null;
  /** The id of the user who created this element. */
  createdBy: string | null;
  /**
   * The date and time for when the element was last edited.
   * @format date-time
   */
  lastChanged: string | null;
  /** The id of the user who last changed this element. */
  lastChangedBy: string | null;
}

export interface InstanceSelection {
  rowsPerPageOptions?: number[] | null;
  /** @format int32 */
  defaultRowsPerPage?: number | null;
  /** @format int32 */
  defaultSelectedOption?: number | null;
  sortDirection?: string | null;
}

export interface InstanceStatus {
  isArchived?: boolean;
  /** @format date-time */
  archived?: string | null;
  isSoftDeleted?: boolean;
  /** @format date-time */
  softDeleted?: string | null;
  isHardDeleted?: boolean;
  /** @format date-time */
  hardDeleted?: string | null;
  readStatus?: ReadStatus;
  substatus?: Substatus;
}

/** Specialized model for instansiation of instances */
export interface InstansiationInstance {
  instanceOwner?: InstanceOwner;
  /**
   * Gets or sets the due date to submit the instance to application owner.
   * @format date-time
   */
  dueBefore?: string | null;
  /**
   * Gets or sets date and time for when the instance should first become visible for the instance owner.
   * @format date-time
   */
  visibleAfter?: string | null;
  /** Gets or sets the prefill values for the instance. */
  prefill?: Record<string, string | null>;
  /** Gets or sets the id of the instance to use as a source for the new instance. */
  sourceInstanceId?: string | null;
}

export interface InstantiationValidationResult {
  valid?: boolean;
  customTextKey?: string | null;
  customTextParameters?: Record<string, string>;
  message?: string | null;
  validParties?: Party[] | null;
}

export interface InvoiceDetails {
  invoiceNumber?: string | null;
}

export interface JsonNode {
  options?: JsonNodeOptions;
  parent?: JsonNode;
  root?: JsonNode;
}

export interface JsonNodeOptions {
  propertyNameCaseInsensitive?: boolean;
}

export interface JsonPatch {
  operations?: PatchOperation[] | null;
}

export interface KeyValueEntry {
  key?: string | null;
  value?: string | null;
}

export interface Logo {
  displayAppOwnerNameInHeader?: boolean;
  source?: string | null;
  size?: string | null;
}

/** Contains the result of an organisation lookup. */
export interface LookupOrganisationResponse {
  /** Indicates whether a person was found or not. */
  success?: boolean;
  /** Contains details about an organisation */
  organisationDetails?: OrganisationDetails;
}

/** Data transfer object for the request to search for a person. */
export interface LookupPersonRequest {
  /** The social security number of the person to search for. */
  socialSecurityNumber: string | null;
  /** The last name of the person to search for. */
  lastName: string | null;
}

/** Contains the result of a person search request. */
export interface LookupPersonResponse {
  /** Indicates whether a person was found or not. */
  success?: boolean;
  /** Contains details about a person */
  personDetails?: PersonDetails;
}

export interface MessageBoxConfig {
  hideSettings?: HideSettings;
  syncAdapterSettings?: SyncAdapterSettings;
}

export interface OnEntry {
  show?: string | null;
  instanceSelection?: InstanceSelection;
}

export interface OnEntryConfig {
  show?: string | null;
}

export interface OrderDetails {
  paymentProcessorId: string | null;
  receiver: PaymentReceiver;
  payer?: Payer;
  currency: string | null;
  orderLines: PaymentOrderLine[] | null;
  allowedPayerTypes?: PayerType[] | null;
  orderReference?: string | null;
  /** @format double */
  totalPriceExVat?: number;
  /** @format double */
  totalVat?: number;
  /** @format double */
  totalPriceIncVat?: number;
}

/** Contains details about an organisation */
export interface OrganisationDetails {
  /** The organisation number */
  orgNr: string | null;
  /** The full name */
  name: string | null;
}

export interface Organization {
  orgNumber?: string | null;
  name?: string | null;
  unitType?: string | null;
  telephoneNumber?: string | null;
  mobileNumber?: string | null;
  faxNumber?: string | null;
  eMailAddress?: string | null;
  internetAddress?: string | null;
  mailingAddress?: string | null;
  mailingPostalCode?: string | null;
  mailingPostalCity?: string | null;
  businessAddress?: string | null;
  businessPostalCode?: string | null;
  businessPostalCity?: string | null;
  unitStatus?: string | null;
}

export interface Party {
  /** @format int32 */
  partyId?: number;
  /** @format uuid */
  partyUuid?: string | null;
  partyTypeName?: PartyType;
  orgNumber?: string | null;
  ssn?: string | null;
  unitType?: string | null;
  name?: string | null;
  isDeleted?: boolean;
  onlyHierarchyElementWithNoAccess?: boolean;
  person?: Person;
  organization?: Organization;
  childParties?: Party[] | null;
}

/** Class representing a party */
export interface PartyResponse {
  /**
   * The ID of the party
   * @format int32
   */
  partyId: number;
  /**
   * The UUID of the party
   * @format uuid
   */
  partyUuid: string | null;
  partyTypeName: PartyType;
  /** Person number (national identification number) of the party. Null if the party is not a person. */
  ssn: string | null;
  /** The organisation number of the party. Null if the party is not an organisation. */
  orgNumber: string | null;
  /** The UnitType */
  unitType: string | null;
  /** The Name */
  name: string | null;
  /** The IsDeleted */
  isDeleted: boolean;
}

export interface PartyTypesAllowed {
  bankruptcyEstate?: boolean;
  organisation?: boolean;
  person?: boolean;
  subUnit?: boolean;
}

/** Item class for the list of patches with Id */
export interface PatchListItem {
  /**
   * The guid for the data element this patch applies to
   * @format uuid
   */
  dataElementId?: string;
  patch?: JsonPatch;
}

export interface PatchOperation {
  op?: OperationType;
  from?: string[] | null;
  path?: string[] | null;
  value?: JsonNode;
}

export interface Payer {
  privatePerson?: PayerPrivatePerson;
  company?: PayerCompany;
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface PayerCompany {
  organisationNumber?: string | null;
  name?: string | null;
  contactPerson?: PayerPrivatePerson;
}

export interface PayerPrivatePerson {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: PhoneNumber;
}

export interface PaymentDetails {
  paymentId: string | null;
  redirectUrl?: string | null;
  payer?: Payer;
  paymentType?: string | null;
  paymentMethod?: string | null;
  createdDate?: string | null;
  chargedDate?: string | null;
  invoiceDetails?: InvoiceDetails;
  cardDetails?: CardDetails;
}

export interface PaymentInformation {
  taskId: string | null;
  status: PaymentStatus;
  orderDetails: OrderDetails;
  paymentDetails?: PaymentDetails;
}

export interface PaymentOrderLine {
  id: string | null;
  name: string | null;
  textResourceKey?: string | null;
  /** @format double */
  priceExVat: number;
  /** @format int32 */
  quantity?: number;
  /** @format double */
  vatPercent: number;
  unit?: string | null;
}

export interface PaymentReceiver {
  organisationNumber?: string | null;
  name?: string | null;
  postalAddress?: Address;
  bankAccountNumber?: string | null;
  email?: string | null;
  phoneNumber?: PhoneNumber;
}

export interface Person {
  ssn?: string | null;
  name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  telephoneNumber?: string | null;
  mobileNumber?: string | null;
  mailingAddress?: string | null;
  mailingPostalCode?: string | null;
  mailingPostalCity?: string | null;
  addressMunicipalNumber?: string | null;
  addressMunicipalName?: string | null;
  addressStreetName?: string | null;
  addressHouseNumber?: string | null;
  addressHouseLetter?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  /** @format date-time */
  dateOfDeath?: string | null;
}

/** Contains details about a person */
export interface PersonDetails {
  /** The social security number */
  ssn: string | null;
  /** The full name */
  name: string | null;
  /** The first name */
  firstName?: string | null;
  /** The middle name */
  middleName?: string | null;
  /** The last name */
  lastName: string | null;
}

export interface PhoneNumber {
  prefix?: string | null;
  number?: string | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}

export interface ProcessElementInfo {
  /** @format int32 */
  flow?: number | null;
  /** @format date-time */
  started?: string | null;
  elementId?: string | null;
  name?: string | null;
  altinnTaskType?: string | null;
  /** @format date-time */
  ended?: string | null;
  validated?: ValidationStatus;
  flowType?: string | null;
}

export interface ProcessHistoryItem {
  eventType?: string | null;
  elementId?: string | null;
  /** @format date-time */
  occured?: string | null;
  /** @format date-time */
  started?: string | null;
  /** @format date-time */
  ended?: string | null;
  performedBy?: string | null;
}

export interface ProcessHistoryList {
  processHistory?: ProcessHistoryItem[] | null;
}

/** Model for process next body */
export interface ProcessNext {
  /** Action performed */
  action?: string | null;
  /** The organisation number of the party the user is acting on behalf of */
  actionOnBehalfOf?: string | null;
}

export interface ProcessState {
  /** @format date-time */
  started?: string | null;
  startEvent?: string | null;
  currentTask?: ProcessElementInfo;
  /** @format date-time */
  ended?: string | null;
  endEvent?: string | null;
}

export interface ProfileSettingPreference {
  languageType?: string | null;
  language?: string | null;
  /** @format int32 */
  preSelectedPartyId?: number;
  doNotPromptForParty?: boolean;
}

export interface Reference {
  value?: string | null;
  relation?: RelationType;
  valueType?: ReferenceType;
}

export interface ResourceLinks {
  apps?: string | null;
  platform?: string | null;
}

/** Represents the request body for setting a set of tags on a data element. */
export interface SetTagsRequest {
  /** A list of tags to set on the data element represented as string values. */
  tags: string[] | null;
}

/** Represents the response from the set tags API endpoint providing a list of tags and current validation issues. */
export interface SetTagsResponse {
  /** A list of tags represented as string values. */
  tags?: string[] | null;
  /** List of validation issues that changed as a result of updating tags. */
  validationIssues?: ValidationSourcePair[] | null;
}

export interface ShadowFields {
  prefix?: string | null;
  saveToDataType?: string | null;
}

/** Contains information about a signee and the current signing status. */
export interface SigneeState {
  /** The name of the signee. */
  name?: string | null;
  /** The organization of the signee. */
  organization?: string | null;
  /** Whether delegation of signing rights has been successful. */
  delegationSuccessful?: boolean;
  /** Represents the state of a notification. */
  notificationStatus?: NotificationStatus;
  /**
   * The party id of the signee.
   * @format int32
   */
  partyId: number;
  /**
   * The time the signee signed.
   * @format date-time
   */
  signedTime?: string | null;
}

/** Represents the response from the API when fetching organizations the user is authorized to sign on behalf of. */
export interface SigningAuthorizedOrganizationsResponse {
  /** The list of authorized organizations. */
  organizations: AuthorizedOrganizationDetails[] | null;
}

/** Response that contains the data elements that should be signed. */
export interface SigningDataElementsResponse {
  /** The data elements that should be signed. */
  dataElements: DataElement[] | null;
}

/** Contains the result of a get signees request. */
export interface SigningStateResponse {
  /** The signees for the current task. */
  signeeStates: SigneeState[] | null;
}

/** A simplified instance model used for presentation of key instance information. */
export interface SimpleInstance {
  /** The instance identifier formated as {instanceOwner.partyId}/{instanceGuid}. */
  id?: string | null;
  /** Presentation texts from the instance */
  presentationTexts?: Record<string, string>;
  /**
   * Gets or sets the due date to submit the instance to application owner.
   * @format date-time
   */
  dueBefore?: string | null;
  /**
   * Last changed date time in UTC format.
   * @format date-time
   */
  lastChanged?: string | null;
  /** Full name of user to last change the instance. */
  lastChangedBy?: string | null;
}

export interface Substatus {
  label?: string | null;
  description?: string | null;
}

export interface SyncAdapterSettings {
  /** @default false */
  disableSync?: boolean;
  /** @default false */
  disableCreate?: boolean;
  /** @default false */
  disableDelete?: boolean;
  /** @default false */
  disableAddActivities?: boolean;
  /** @default false */
  disableAddTransmissions?: boolean;
  /** @default false */
  disableSyncDueAt?: boolean;
  /** @default false */
  disableSyncStatus?: boolean;
  /** @default false */
  disableSyncContentTitle?: boolean;
  /** @default false */
  disableSyncContentSummary?: boolean;
  /** @default false */
  disableSyncAttachments?: boolean;
  /** @default false */
  disableSyncApiActions?: boolean;
  /** @default false */
  disableSyncGuiActions?: boolean;
}

/** Represents the response from an API endpoint providing a list of tags. */
export interface TagsList {
  /** A list of tags represented as string values. */
  tags?: string[] | null;
}

export interface TextResource {
  id?: string | null;
  org?: string | null;
  language?: string | null;
  resources?: TextResourceElement[] | null;
}

export interface TextResourceElement {
  id?: string | null;
  value?: string | null;
  variables?: TextResourceVariable[] | null;
}

export interface TextResourceVariable {
  key?: string | null;
  dataSource?: string | null;
  defaultValue?: string | null;
}

export interface UserAction {
  id: string | null;
  authorized?: boolean;
  type?: ActionType;
}

/** Request model for user action */
export interface UserActionRequest {
  /** Action performed */
  action?: string | null;
  /** The id of the button that was clicked */
  buttonId?: string | null;
  /** Additional metadata for the action */
  metadata?: Record<string, string>;
  /** Ignored validators that should not be evauated as part of this action */
  ignoredValidators?: string[] | null;
  /** The organisation number of the party the user is acting on behalf of */
  onBehalfOf?: string | null;
}

/** Response object from action endpoint */
export interface UserActionResponse {
  instance: Instance;
  /** Data models that have been updated */
  updatedDataModels?: Record<string, any>;
  /**
   * Gets a dictionary of updated validation issues. The first key is the data model id, the second key is the validator id
   * Validators that are not listed in the dictionary are assumed to have not been executed
   */
  updatedValidationIssues?: Record<
    string,
    Record<string, ValidationIssueWithSource[]>
  >;
  /** Actions the client should perform after action has been performed backend */
  clientActions?: ClientAction[] | null;
  error?: ActionError;
  /**
   * If the action requires the client to redirect to another url, this property should be set
   * @format uri
   */
  redirectUrl?: string | null;
}

/** Represents the response from an API endpoint providing a list of key-value properties. */
export interface UserDefinedMetadataDto {
  /** A list of properties represented as key-value pairs. */
  userDefinedMetadata?: KeyValueEntry[] | null;
}

export interface UserProfile {
  /** @format int32 */
  userId?: number;
  /** @format uuid */
  userUuid?: string | null;
  userName?: string | null;
  externalIdentity?: string | null;
  isReserved?: boolean;
  phoneNumber?: string | null;
  email?: string | null;
  /** @format int32 */
  partyId?: number;
  party?: Party;
  userType?: UserType;
  profileSettingPreference?: ProfileSettingPreference;
}

export interface ValidationIssueWithSource {
  severity: ValidationIssueSeverity;
  dataElementId?: string | null;
  field?: string | null;
  code: string | null;
  description: string | null;
  /** @minLength 1 */
  source: string;
  noIncrementalUpdates?: boolean;
  customTextKey?: string | null;
  /** @deprecated */
  customTextParams?: string[] | null;
  customTextParameters?: Record<string, string>;
}

export interface ValidationSourcePair {
  /** @minLength 1 */
  source: string;
  issues: ValidationIssueWithSource[];
}

export interface ValidationStatus {
  /** @format date-time */
  timestamp?: string | null;
  canCompleteTask?: boolean;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;


export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
                                              body,
                                              secure,
                                              path,
                                              type,
                                              query,
                                              format,
                                              baseUrl,
                                              cancelToken,
                                              ...params
                                            }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
          .then((data) => {
            if (r.ok) {
              r.data = data;
            } else {
              r.error = data;
            }
            return r;
          })
          .catch((e) => {
            r.error = e;
            return r;
          });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Altinn App Api
 * @version v1
 *
 * App API description for both end users and service owners, as well as open metadata information<br><br>All operations* described within this document require authentication and authorization. Read more at <a href="https://docs.altinn.studio/authentication/guides">https://docs.altinn.studio/authentication/guides</a><br><br><strong>All GET operations* and POST operations may return or contain, respectively, personally identifiable information (PII; national identity numbers and names).</strong><br><br>For more information about this product, see <a href="https://docs.altinn.studio/api/apps">https://docs.altinn.studio/api/apps</a><br><br><em>* Except the metadata APIs</em>
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  org = {
    /**
     * No description
     *
     * @tags Actions
     * @name ActionsCreate
     * @summary Perform a task action on an instance
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions
     */
    actionsCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: UserActionRequest,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserActionResponse, UserActionResponse | void>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/actions`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationLanguage
     * @name V1ApplicationlanguagesList
     * @summary Method to retrieve the supported languages from the application.
     * @request GET:/{org}/{app}/api/v1/applicationlanguages
     */
    v1ApplicationlanguagesList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<ApplicationLanguage[], void>({
        path: `/${org}/${app}/api/v1/applicationlanguages`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationMetadata
     * @name V1ApplicationmetadataList
     * @summary Get the application metadata "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json"

     If org and app does not match, this returns a 409 Conflict response
     * @request GET:/{org}/{app}/api/v1/applicationmetadata
     */
    v1ApplicationmetadataList: (
      org: string,
      app: string,
      query?: {
        /**
         * Boolean get parameter to skip verification of correct org/app
         * @default true
         */
        checkOrgApp?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<ApplicationMetadata, string>({
        path: `/${org}/${app}/api/v1/applicationmetadata`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationMetadata
     * @name V1MetaAuthorizationpolicyList
     * @summary Get the application XACML policy file

     If org and app does not match, this returns a 409 Conflict response
     * @request GET:/{org}/{app}/api/v1/meta/authorizationpolicy
     */
    v1MetaAuthorizationpolicyList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<string, ProblemDetails | string>({
        path: `/${org}/${app}/api/v1/meta/authorizationpolicy`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationMetadata
     * @name V1MetaProcessList
     * @summary Get the application BPMN process file

     If org and app does not match, this returns a 409 Conflict response
     * @request GET:/{org}/{app}/api/v1/meta/process
     */
    v1MetaProcessList: (org: string, app: string, params: RequestParams = {}) =>
      this.request<string, ProblemDetails | string>({
        path: `/${org}/${app}/api/v1/meta/process`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationSettings
     * @name V1ApplicationsettingsList
     * @summary Returns the application settings
     * @request GET:/{org}/{app}/api/v1/applicationsettings
     */
    v1ApplicationsettingsList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<Record<string, string>, any>({
        path: `/${org}/${app}/api/v1/applicationsettings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authentication
     * @name AuthenticationKeepAliveList
     * @summary Refreshes the AltinnStudioRuntime JwtToken when not in AltinnStudio mode.
     * @request GET:/{org}/{app}/api/Authentication/keepAlive
     */
    authenticationKeepAliveList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<void, void>({
        path: `/${org}/${app}/api/Authentication/keepAlive`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authentication
     * @name AuthenticationInvalidatecookieUpdate
     * @summary Invalidates the AltinnStudioRuntime cookie.
     * @request PUT:/{org}/{app}/api/Authentication/invalidatecookie
     */
    authenticationInvalidatecookieUpdate: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/Authentication/invalidatecookie`,
        method: "PUT",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authorization
     * @name AuthorizationPartiesCurrentList
     * @summary Gets current party by reading cookie value and validating.
     * @request GET:/{org}/{app}/api/authorization/parties/current
     */
    authorizationPartiesCurrentList: (
      org: string,
      app: string,
      query?: {
        /** @default false */
        returnPartyObject?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Party, void>({
        path: `/${org}/${app}/api/authorization/parties/current`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataCreate
     * @summary Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
     * @deprecated
     */
    dataCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** identifies the data element type to create */
        dataType?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataPartialUpdate
     * @summary Updates an existing form data element with patches to multiple data elements.
     * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
     */
    dataPartialUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: DataPatchRequestMultiple,
      query?: {
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataPatchResponseMultiple, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
        method: "PATCH",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataTypeCreate
     * @summary Creates and instantiates a data element of a given element-type. Clients can upload the data element in the request content.
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/type/{dataType}
     */
    dataTypeCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataType: string,
      query?: {
        /** comma separated string of validators to ignore */
        ignoredValidators?: string;
        /** The currently active user language */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataPostResponse, DataPostErrorResponse | ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/type/${dataType}`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataDetail
     * @summary Gets a data element from storage and applies business logic if necessary.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      dataType: string,
      query?: {
        /**
         * Whether to initialize or remove AltinnRowId fields in the model
         * @default false
         */
        includeRowId?: boolean;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataUpdate
     * @summary Updates an existing data element with new content.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      dataType: string,
      query?: {
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<CalculationResult, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataPartialUpdate2
     * @summary Updates an existing form data element with a patch of changes.
     * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     * @deprecated
     * @originalName dataPartialUpdate
     * @duplicate
     */
    dataPartialUpdate2: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      data: DataPatchRequest,
      query?: {
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataPatchResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
        method: "PATCH",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataDelete
     * @summary Delete a data element.
     * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataDelete: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      dataType: string,
      query?: {
        /** comma separated string of validators to ignore */
        ignoredValidators?: string;
        /** The currently active language */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataPostResponse, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
        method: "DELETE",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataLists
     * @name DatalistsDetail
     * @summary Api that exposes app related datalists
     * @request GET:/{org}/{app}/api/datalists/{id}
     */
    datalistsDetail: (
      id: string,
      org: string,
      app: string,
      query?: {
        /** Query parameteres supplied */
        queryParams?: Record<string, string>;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/datalists/${id}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataLists
     * @name DatalistsDetail2
     * @summary Exposes datalists related to the app and logged in user
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/datalists/{id}
     * @originalName datalistsDetail
     * @duplicate
     */
    datalistsDetail2: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      id: string,
      org: string,
      app: string,
      query?: {
        /** Query parameters supplied */
        queryParams?: Record<string, string>;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/datalists/${id}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataTags
     * @name DataTagsList
     * @summary Retrieves all tags associated with the given data element.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
     */
    dataTagsList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<TagsList, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataTags
     * @name DataTagsCreate
     * @summary Adds a new tag to a data element.
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
     */
    dataTagsCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      data: string,
      params: RequestParams = {},
    ) =>
      this.request<TagsList, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataTags
     * @name DataTagsUpdate
     * @summary Sets a set of tags on a data element.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
     */
    dataTagsUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      data: SetTagsRequest,
      query?: {
        /** comma separated string of validators to ignore. If missing we don't run validation. */
        ignoredValidators?: string;
        /** The currently active user language. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SetTagsResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
        method: "PUT",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DataTags
     * @name DataTagsDelete
     * @summary Removes a tag from a data element.
     * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags/{tag}
     */
    dataTagsDelete: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      tag: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags/${tag}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags EventsReceiver
     * @name V1EventsreceiverCreate
     * @summary Create a new inbound event for the app to process.
     * @request POST:/{org}/{app}/api/v1/eventsreceiver
     */
    v1EventsreceiverCreate: (
      org: string,
      app: string,
      data: CloudEvent,
      query?: {
        code?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, string | void>({
        path: `/${org}/${app}/api/v1/eventsreceiver`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags ExternalApi
     * @name ApiExternalDetail
     * @summary Get the data for a specific implementation of an external api, identified by externalApiId
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/api/external/{externalApiId}
     */
    apiExternalDetail: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      externalApiId: string,
      org: string,
      app: string,
      query?: {
        /** The query parameters to pass to the external api endpoint */
        queryParams?: Record<string, string>;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, string | ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/api/external/${externalApiId}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags FileScan
     * @name FilescanresultList
     * @summary Checks that file scan result for an instance and it's data elements.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/filescanresult
     */
    filescanresultList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<InstanceFileScanResult, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/filescanresult`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name GetOrg
     * @summary Main entry point for the application. Handles authentication, party selection, and routing to appropriate views.
     * @request GET:/{org}/{app}
     */
    getOrg: (
      org: string,
      app: string,
      query?: {
        /**
         * If true, skips party selection prompt even when PromptForParty is 'always'.
         * @default false
         */
        skipPartySelection?: boolean;
        /**
         * If true, forces creation of a new instance even when existing instances are found.
         * @default false
         */
        forceNew?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name InstanceSelectionList
     * @summary Shows instance selection page with list of user's instances.
     * @request GET:/{org}/{app}/instance-selection
     */
    instanceSelectionList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance-selection`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name PartySelectionList
     * @summary Shows party selection page with list of parties user can represent.
     * @request GET:/{org}/{app}/party-selection
     */
    partySelectionList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/party-selection`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name PartySelectionDetail
     * @summary Shows party selection page with list of parties user can represent (with error code).
     * @request GET:/{org}/{app}/party-selection/{errorCode}
     */
    partySelectionDetail: (
      org: string,
      app: string,
      errorCode: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/party-selection/${errorCode}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name InstanceDetail
     * @summary Redirects from party-only URL to most recent instance for that party.
     * @request GET:/{org}/{app}/instance/{partyId}
     */
    instanceDetail: (
      org: string,
      app: string,
      partyId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance/${partyId}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name InstanceDetail2
     * @summary Resolves the current task and redirects to the full instance URL with task and page information.
     * @request GET:/{org}/{app}/instance/{partyId}/{instanceGuid}
     * @originalName instanceDetail
     * @duplicate
     */
    instanceDetail2: (
      org: string,
      app: string,
      partyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance/${partyId}/${instanceGuid}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name ProcessEndList
     * @summary Renders the receipt page when the process has ended.
     * @request GET:/{org}/{app}/instance/{partyId}/{instanceGuid}/ProcessEnd
     */
    processEndList: (
      org: string,
      app: string,
      partyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance/${partyId}/${instanceGuid}/ProcessEnd`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name InstanceDetail3
     * @summary Resolves instance with specific task. Redirects to first page if task is current,
     otherwise renders app with full data (frontend will show "not available" UI).
     * @request GET:/{org}/{app}/instance/{partyId}/{instanceGuid}/{taskId}
     * @originalName instanceDetail
     * @duplicate
     */
    instanceDetail3: (
      org: string,
      app: string,
      partyId: number,
      instanceGuid: string,
      taskId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance/${partyId}/${instanceGuid}/${taskId}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name InstanceDetail4
     * @summary Renders the main application view for a specific instance, task, and page.
     * @request GET:/{org}/{app}/instance/{partyId}/{instanceGuid}/{taskId}/{pageId}
     * @originalName instanceDetail
     * @duplicate
     */
    instanceDetail4: (
      org: string,
      app: string,
      partyId: number,
      instanceGuid: string,
      taskId: string,
      pageId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instance/${partyId}/${instanceGuid}/${taskId}/${pageId}`,
        method: "GET",
        ...params,
      }),

    /**
     * @description Only parameters specified in [dataTypeId].prefill.json will be accepted. Returns an HTML document with a small javascript that will set session variables in frontend and redirect to the app.
     *
     * @tags Home
     * @name SetQueryParamsList
     * @summary Sets query parameters in frontend session storage for later use in prefill of stateless apps
     * @request GET:/{org}/{app}/set-query-params
     */
    setQueryParamsList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<string, string>({
        path: `/${org}/${app}/set-query-params`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name DebugInitialDataList
     * @summary Debug endpoint to test the initial data service.
     * @request GET:/{org}/{app}/debug-initial-data
     */
    debugInitialDataList: (
      org: string,
      app: string,
      query?: {
        instanceId?: string;
        /** @format int32 */
        partyId?: number;
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/debug-initial-data`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name ErrorList
     * @request GET:/{org}/{app}/error
     */
    errorList: (
      org: string,
      app: string,
      query?: {
        /** @default false */
        skipPartySelection?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/error`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name InstancesDetail
     * @summary Gets an instance object from storage.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
     */
    instancesDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<InstanceResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name InstancesDelete
     * @summary Deletes an instance.
     * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
     */
    instancesDelete: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      org: string,
      app: string,
      query?: {
        /** A value indicating whether the instance should be unrecoverable. */
        hard?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Instance, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
        method: "DELETE",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name InstancesCreate
     * @summary Creates a new instance of an application in platform storage. Clients can send an instance as json or send a
     multipart form-data with the instance in the first part named "instance" and the prefill data in the next parts, with
     names that correspond to the element types defined in the application metadata.
     The data elements are stored. Currently calculate and validate is not implemented.
     * @request POST:/{org}/{app}/instances
     */
    instancesCreate: (
      org: string,
      app: string,
      query?: {
        /**
         * unique id of the party that is the owner of the instance
         * @format int32
         */
        instanceOwnerPartyId?: number;
        /** The currently active user language */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<InstanceResponse, ProblemDetails>({
        path: `/${org}/${app}/instances`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name CreateCreate
     * @summary Simplified Instanciation with support for fieldprefill
     * @request POST:/{org}/{app}/instances/create
     */
    createCreate: (
      org: string,
      app: string,
      data: InstansiationInstance,
      query?: {
        /** The currently active user language */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<InstanceResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/create`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Add to an instance that a given stakeholder considers the instance as no longer needed by them. The stakeholder has collected all the data and information they needed from the instance and expect no additional data to be added to it. The body of the request isn't used for anything despite this being a POST operation.
     *
     * @tags Instances
     * @name CompleteCreate
     * @summary Add complete confirmation.
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete
     */
    completeCreate: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<Instance, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/complete`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name SubstatusUpdate
     * @summary Allows an app owner to update the substatus of an instance.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus
     */
    substatusUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: Substatus,
      params: RequestParams = {},
    ) =>
      this.request<Instance, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/substatus`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name ActiveList
     * @summary Retrieves all active instances that fulfull the org, app, and instanceOwnerParty Id combination.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/active
     */
    activeList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      params: RequestParams = {},
    ) =>
      this.request<SimpleInstance[], any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/active`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags LookupOrganisation
     * @name V1LookupOrganisationDetail
     * @summary Allows an organisation lookup by orgNr in ER
     * @request GET:/{org}/{app}/api/v1/lookup/organisation/{orgNr}
     */
    v1LookupOrganisationDetail: (
      orgNr: string,
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<LookupOrganisationResponse, ProblemDetails>({
        path: `/${org}/${app}/api/v1/lookup/organisation/${orgNr}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags LookupPerson
     * @name V1LookupPersonCreate
     * @summary Lookup a person in Folkeregisteret (DSF)
     * @request POST:/{org}/{app}/api/v1/lookup/person
     */
    v1LookupPersonCreate: (
      org: string,
      app: string,
      data: LookupPersonRequest,
      params: RequestParams = {},
    ) =>
      this.request<LookupPersonResponse, ProblemDetails>({
        path: `/${org}/${app}/api/v1/lookup/person`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Options
     * @name OptionsDetail
     * @summary Api that exposes app related options
     * @request GET:/{org}/{app}/api/options/{optionsId}
     */
    optionsDetail: (
      optionsId: string,
      org: string,
      app: string,
      query?: {
        /** Query parameters supplied */
        queryParams?: Record<string, string>;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/options/${optionsId}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Options
     * @name OptionsDetail2
     * @summary Exposes options related to the app and logged in user
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/{optionsId}
     * @originalName optionsDetail
     * @duplicate
     */
    optionsDetail2: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      optionsId: string,
      query?: {
        /** The language selected by the user. */
        language?: string;
        /** Query parameteres supplied */
        queryParams?: Record<string, string>;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/options/${optionsId}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name PagesOrderCreate
     * @summary Get the page order based on the current state of the instance
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/pages/order
     * @deprecated
     */
    pagesOrderCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: any,
      query?: {
        layoutSetId?: string;
        currentPage?: string;
        dataTypeId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<string[], string>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/pages/order`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Parties
     * @name V1PartiesList
     * @summary Gets the list of parties the user can represent
     * @request GET:/{org}/{app}/api/v1/parties
     */
    v1PartiesList: (
      org: string,
      app: string,
      query?: {
        /**
         * when set to true returns parties that are allowed to instantiate
         * @default false
         */
        allowedToInstantiateFilter?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Party[], ProblemDetails>({
        path: `/${org}/${app}/api/v1/parties`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Parties
     * @name V1PartiesValidateInstantiationCreate
     * @summary Validates party and profile settings before the end user is allowed to instantiate a new app instance
     * @request POST:/{org}/{app}/api/v1/parties/validateInstantiation
     * @deprecated
     */
    v1PartiesValidateInstantiationCreate: (
      org: string,
      app: string,
      query?: {
        /**
         * The selected partyId
         * @format int32
         */
        partyId?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<InstantiationValidationResult, string>({
        path: `/${org}/${app}/api/v1/parties/validateInstantiation`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Parties
     * @name V1PartiesUpdate
     * @summary Updates the party the user represents
     * @request PUT:/{org}/{app}/api/v1/parties/{partyId}
     */
    v1PartiesUpdate: (
      partyId: number,
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<string, string>({
        path: `/${org}/${app}/api/v1/parties/${partyId}`,
        method: "PUT",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Payment
     * @name PaymentList
     * @summary Get updated payment information for the instance. Will contact the payment processor to check the status of the payment. Current task must be a payment task. See payment related documentation.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment
     */
    paymentList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<PaymentInformation, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Payment
     * @name PaymentOrderDetailsList
     * @summary Run order details calculations and return the result. Does not require the current task to be a payment task.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment/order-details
     */
    paymentOrderDetailsList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<OrderDetails, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment/order-details`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pdf
     * @name DataPdfFormatList
     * @summary Get the pdf formatting
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/pdf/format
     */
    dataPdfFormatList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<any, string>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/pdf/format`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessList
     * @summary Get the process state of an instance.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process
     */
    processList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<AppProcessState, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessStartCreate
     * @summary Starts the process of an instance.
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/start
     */
    processStartCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** a specific start event id to start the process, must be used if there are more than one start events */
        startEvent?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<AppProcessState, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/start`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessNextList
     * @summary Gets a list of the next process elements that can be reached from the current process element.
     If process is not started it returns the possible start events.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
     * @deprecated
     */
    processNextList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<string[], ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessNextUpdate
     * @summary Change the instance's process state to next process element in accordance with process definition.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
     */
    processNextUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: ProcessNext,
      query?: {
        /** obsolete: alias for action */
        elementId?: string;
        /** Signal the language to use for pdf generation, error messages... */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<AppProcessState, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
        method: "PUT",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessCompleteProcessUpdate
     * @summary Attemts to end the process by running next until an end event is reached.
     Notice that process must have been started.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/completeProcess
     */
    processCompleteProcessUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<AppProcessState, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/completeProcess`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessHistoryList
     * @summary Get the process history for an instance.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/history
     */
    processHistoryList: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<ProcessHistoryList, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/history`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Profile
     * @name V1ProfileUserList
     * @summary Method that returns the user information about the user that is logged in
     * @request GET:/{org}/{app}/api/v1/profile/user
     */
    v1ProfileUserList: (org: string, app: string, params: RequestParams = {}) =>
      this.request<UserProfile, string>({
        path: `/${org}/${app}/api/v1/profile/user`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Redirect
     * @name V1RedirectList
     * @summary Validates URL used for redirection
     * @request GET:/{org}/{app}/api/v1/redirect
     */
    v1RedirectList: (
      org: string,
      app: string,
      query: {
        /** Base64 encoded string of the URL to validate */
        url: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<string, ProblemDetails>({
        path: `/${org}/${app}/api/v1/redirect`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name JsonschemaDetail
     * @summary Get the json schema for the model
     * @request GET:/{org}/{app}/api/jsonschema/{id}
     */
    jsonschemaDetail: (
      id: string,
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/jsonschema/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint assumes a single layout set and does not work for apps on version 8.0 and above.
     *
     * @tags Resource
     * @name LayoutsList
     * @summary Get the form layout
     * @request GET:/{org}/{app}/api/layouts
     * @deprecated
     */
    layoutsList: (org: string, app: string, params: RequestParams = {}) =>
      this.request<any, string>({
        path: `/${org}/${app}/api/layouts`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsDetail
     * @summary Get the form layout
     * @request GET:/{org}/{app}/api/layouts/{id}
     */
    layoutsDetail: (
      org: string,
      app: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/layouts/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsettingsList
     * @summary Get the layout settings.
     * @request GET:/{org}/{app}/api/layoutsettings
     */
    layoutsettingsList: (
      org: string,
      app: string,
      params: RequestParams = {},
    ) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/layoutsettings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsettingsDetail
     * @summary Get the layout settings.
     * @request GET:/{org}/{app}/api/layoutsettings/{id}
     */
    layoutsettingsDetail: (
      org: string,
      app: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/layoutsettings/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsetsList
     * @summary Get the layout-sets
     * @request GET:/{org}/{app}/api/layoutsets
     */
    layoutsetsList: (org: string, app: string, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/layoutsets`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name V1FooterList
     * @summary Get the footer layout
     * @request GET:/{org}/{app}/api/v1/footer
     */
    v1FooterList: (org: string, app: string, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/v1/footer`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name ValidationconfigDetail
     * @summary Get validation configuration file.
     * @request GET:/{org}/{app}/api/validationconfig/{dataTypeId}
     */
    validationconfigDetail: (
      org: string,
      app: string,
      dataTypeId: string,
      params: RequestParams = {},
    ) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/validationconfig/${dataTypeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Signing
     * @name SigningList
     * @summary Get updated signing state for the current signing task.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/signing
     */
    signingList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SigningStateResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Signing
     * @name SigningOrganizationsList
     * @summary Get the organizations that the user can sign on behalf of, if any. Determined by the user having a key role at the organization.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/signing/organizations
     */
    signingOrganizationsList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SigningAuthorizedOrganizationsResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing/organizations`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Signing
     * @name SigningDataElementsList
     * @summary Get the data elements being signed in the current signature task.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/signing/data-elements
     */
    signingDataElementsList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SigningDataElementsResponse, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing/data-elements`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessData
     * @name DataList
     * @summary Create a new data object of the defined data type
     * @request GET:/{org}/{app}/v1/data
     */
    dataList: (
      org: string,
      app: string,
      query?: {
        /** The data type id */
        dataType?: string;
        /** Prefilled fields from query parameters */
        prefill?: string;
        /**
         * Whether to initialize or remove AltinnRowId fields in the model
         * @default false
         */
        includeRowId?: boolean;
        /** Currently selected language by the user (if available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, ProblemDetails>({
        path: `/${org}/${app}/v1/data`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessData
     * @name DataCreate2
     * @summary Create a new data object of the defined data type
     * @request POST:/{org}/{app}/v1/data
     * @originalName dataCreate
     * @duplicate
     */
    dataCreate2: (
      org: string,
      app: string,
      query?: {
        /** The data type id */
        dataType?: string;
        /**
         * Whether to initialize or remove AltinnRowId fields in the model
         * @default false
         */
        includeRowId?: boolean;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, any>({
        path: `/${org}/${app}/v1/data`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessData
     * @name DataAnonymousList
     * @summary Create a new data object of the defined data type
     * @request GET:/{org}/{app}/v1/data/anonymous
     */
    dataAnonymousList: (
      org: string,
      app: string,
      query?: {
        /** The data type id */
        dataType?: string;
        /**
         * Whether to initialize or remove AltinnRowId fields in the model
         * @default false
         */
        includeRowId?: boolean;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, any>({
        path: `/${org}/${app}/v1/data/anonymous`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessData
     * @name DataAnonymousCreate
     * @summary Create a new data object of the defined data type
     * @request POST:/{org}/{app}/v1/data/anonymous
     */
    dataAnonymousCreate: (
      org: string,
      app: string,
      query?: {
        /** The data type id */
        dataType?: string;
        /**
         * Whether to initialize or remove AltinnRowId fields in the model
         * @default false
         */
        includeRowId?: boolean;
        /** The language selected by the user. */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, any>({
        path: `/${org}/${app}/v1/data/anonymous`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessPages
     * @name PagesOrderCreate2
     * @summary Get the page order based on the current state of the instance
     * @request POST:/{org}/{app}/v1/pages/order
     * @deprecated
     * @originalName pagesOrderCreate
     * @duplicate
     */
    pagesOrderCreate2: (
      org: string,
      app: string,
      data: any,
      query?: {
        layoutSetId?: string;
        currentPage?: string;
        dataTypeId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<string[], string>({
        path: `/${org}/${app}/v1/pages/order`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Texts
     * @name V1TextsDetail
     * @summary Method to retrieve text resources
     * @request GET:/{org}/{app}/api/v1/texts/{language}
     */
    v1TextsDetail: (
      org: string,
      app: string,
      language: string,
      params: RequestParams = {},
    ) =>
      this.request<TextResource, string | void>({
        path: `/${org}/${app}/api/v1/texts/${language}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags UserDefinedMetadata
     * @name DataUserDefinedMetadataList
     * @summary Retrieves user defined metadata associated with the given data element.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
     */
    dataUserDefinedMetadataList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<UserDefinedMetadataDto, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags UserDefinedMetadata
     * @name DataUserDefinedMetadataUpdate
     * @summary Update user defined metadata associated with the given data element.
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
     */
    dataUserDefinedMetadataUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      data: UserDefinedMetadataDto,
      params: RequestParams = {},
    ) =>
      this.request<UserDefinedMetadataDto, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Validate
     * @name ValidateList
     * @summary Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
     to a model, and then finally the state of the instance.
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate
     */
    validateList: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        /** Comma separated list of validators to ignore */
        ignoredValidators?: string;
        /** Ignore validators that don't run on PATCH requests */
        onlyIncrementalValidators?: boolean;
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ValidationIssueWithSource[], ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/validate`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Validate
     * @name DataValidateList
     * @summary Validate a single data element (deprecated).
     Use `/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate` with filters as needed.
     * @request GET:/{org}/{app}/instances/{instanceOwnerId}/{instanceId}/data/{dataGuid}/validate
     * @deprecated
     */
    dataValidateList: (
      org: string,
      app: string,
      instanceOwnerId: number,
      instanceId: string,
      dataGuid: string,
      query?: {
        /** The currently used language by the user (or null if not available) */
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ValidationIssueWithSource[], ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerId}/${instanceId}/data/${dataGuid}/validate`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
}


// /* eslint-disable */
// /* tslint:disable */
// /*
//  * ---------------------------------------------------------------
//  * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
//  * ##                                                           ##
//  * ## AUTHOR: acacode                                           ##
//  * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
//  * ---------------------------------------------------------------
//  */
//
// export interface ActionError {
//   code?: string | null;
//   message?: string | null;
//   metadata?: Record<string, string>;
// }
//
// /** @format int32 */
// export enum ActionType {
//   Value0 = 0,
//   Value1 = 1,
// }
//
// export interface Address {
//   name?: string | null;
//   addressLine1?: string | null;
//   addressLine2?: string | null;
//   postalCode?: string | null;
//   city?: string | null;
//   country?: string | null;
// }
//
// export interface AllLayoutSettingsDTO {
//   layouts?: string | null;
//   schema?: string | null;
//   settings?: string | null;
// }
//
// export interface AppProcessElementInfo {
//   /** @format int32 */
//   flow?: number | null;
//   /** @format date-time */
//   started?: string | null;
//   elementId?: string | null;
//   name?: string | null;
//   altinnTaskType?: string | null;
//   /** @format date-time */
//   ended?: string | null;
//   validated?: ValidationStatus;
//   flowType?: string | null;
//   actions?: Record<string, boolean>;
//   userActions?: UserAction[] | null;
//   read?: boolean;
//   write?: boolean;
// }
//
// export interface AppProcessState {
//   /** @format date-time */
//   started?: string | null;
//   startEvent?: string | null;
//   currentTask?: AppProcessElementInfo;
//   /** @format date-time */
//   ended?: string | null;
//   endEvent?: string | null;
//   processTasks?: AppProcessTaskTypeInfo[] | null;
// }
//
// export interface AppProcessTaskTypeInfo {
//   altinnTaskType?: string | null;
//   elementId?: string | null;
// }
//
// export interface ApplicationLanguage {
//   language?: string | null;
// }
//
// export interface ApplicationLogic {
//   autoCreate?: boolean | null;
//   classRef?: string | null;
//   schemaRef?: string | null;
//   allowAnonymousOnStateless?: boolean;
//   autoDeleteOnProcessEnd?: boolean;
//   disallowUserCreate?: boolean;
//   disallowUserDelete?: boolean;
//   allowInSubform?: boolean;
//   shadowFields?: ShadowFields;
// }
//
// export interface ApplicationMetadata {
//   /** @format date-time */
//   created?: string | null;
//   createdBy?: string | null;
//   /** @format date-time */
//   lastChanged?: string | null;
//   lastChangedBy?: string | null;
//   versionId?: string | null;
//   org?: string | null;
//   title?: Record<string, string | null>;
//   /** @format date-time */
//   validFrom?: string | null;
//   /** @format date-time */
//   validTo?: string | null;
//   processId?: string | null;
//   dataTypes?: DataType[] | null;
//   partyTypesAllowed?: PartyTypesAllowed;
//   autoDeleteOnProcessEnd?: boolean;
//   presentationFields?: DataField[] | null;
//   dataFields?: DataField[] | null;
//   eFormidling?: EFormidlingContract;
//   onEntry?: OnEntry;
//   messageBoxConfig?: MessageBoxConfig;
//   copyInstanceSettings?: CopyInstanceSettings;
//   /** @format int32 */
//   storageAccountNumber?: number | null;
//   disallowUserInstantiation?: boolean;
//   id?: string | null;
//   features?: Record<string, boolean>;
//   logo?: Logo;
//   altinnNugetVersion?: string | null;
//   externalApiIds?: string[] | null;
//   [key: string]: any;
// }
//
// export interface CalculationResult {
//   /** @format date-time */
//   created?: string | null;
//   createdBy?: string | null;
//   /** @format date-time */
//   lastChanged?: string | null;
//   lastChangedBy?: string | null;
//   id?: string | null;
//   instanceGuid?: string | null;
//   dataType?: string | null;
//   filename?: string | null;
//   contentType?: string | null;
//   blobStoragePath?: string | null;
//   selfLinks?: ResourceLinks;
//   /** @format int64 */
//   size?: number;
//   contentHash?: string | null;
//   locked?: boolean;
//   refs?: string[] | null;
//   isRead?: boolean;
//   tags?: string[] | null;
//   userDefinedMetadata?: KeyValueEntry[] | null;
//   metadata?: KeyValueEntry[] | null;
//   deleteStatus?: DeleteStatus;
//   fileScanResult?: FileScanResult;
//   references?: Reference[] | null;
//   changedFields?: Record<string, any>;
// }
//
// export interface CardDetails {
//   maskedPan?: string | null;
//   expiryDate?: string | null;
// }
//
// export interface ClientAction {
//   id?: string | null;
//   metadata?: Record<string, any>;
// }
//
// export interface CloudEvent {
//   id?: string | null;
//   /** @format uri */
//   source?: string | null;
//   specversion?: string | null;
//   type?: string | null;
//   subject?: string | null;
//   /** @format date-time */
//   time?: string;
//   alternativesubject?: string | null;
//   data?: any;
//   /** @format uri */
//   dataschema?: string | null;
//   contenttype?: ContentType;
// }
//
// export interface CompleteConfirmation {
//   stakeholderId?: string | null;
//   /** @format date-time */
//   confirmedOn?: string;
// }
//
// export interface ContentTypeCustom {
//   boundary?: string | null;
//   charSet?: string | null;
//   mediaType?: string | null;
//   name?: string | null;
//   parameters?: any[] | null;
// }
//
// export interface CopyInstanceSettings {
//   enabled?: boolean;
//   excludedDataTypes?: string[] | null;
//   excludedDataFields?: string[] | null;
// }
//
// export interface DataElement {
//   /** @format date-time */
//   created?: string | null;
//   createdBy?: string | null;
//   /** @format date-time */
//   lastChanged?: string | null;
//   lastChangedBy?: string | null;
//   id?: string | null;
//   instanceGuid?: string | null;
//   dataType?: string | null;
//   filename?: string | null;
//   contentType?: string | null;
//   blobStoragePath?: string | null;
//   selfLinks?: ResourceLinks;
//   /** @format int64 */
//   size?: number;
//   contentHash?: string | null;
//   locked?: boolean;
//   refs?: string[] | null;
//   isRead?: boolean;
//   tags?: string[] | null;
//   userDefinedMetadata?: KeyValueEntry[] | null;
//   metadata?: KeyValueEntry[] | null;
//   deleteStatus?: DeleteStatus;
//   fileScanResult?: FileScanResult;
//   references?: Reference[] | null;
// }
//
// export interface DataElementFileScanResult {
//   id?: string | null;
//   fileScanResult?: FileScanResult;
// }
//
// export interface DataField {
//   id?: string | null;
//   path?: string | null;
//   dataTypeId?: string | null;
// }
//
// export interface DataModelPairResponse {
//   /** @format uuid */
//   dataElementId?: string;
//   data?: any;
// }
//
// export interface DataPatchRequest {
//   patch: JsonPatch;
//   ignoredValidators: string[] | null;
// }
//
// export interface DataPatchRequestMultiple {
//   patches: PatchListItem[] | null;
//   ignoredValidators: string[] | null;
// }
//
// export interface DataPatchResponse {
//   validationIssues: Record<string, ValidationIssueWithSource[]>;
//   newDataModel: any;
//   instance: Instance;
// }
//
// export interface DataPatchResponseMultiple {
//   validationIssues: ValidationSourcePair[] | null;
//   newDataModels: DataModelPairResponse[] | null;
//   instance: Instance;
// }
//
// export interface DataPostErrorResponse {
//   type?: string | null;
//   title?: string | null;
//   /** @format int32 */
//   status?: number | null;
//   detail?: string | null;
//   instance?: string | null;
//   uploadValidationIssues?: ValidationIssueWithSource[] | null;
//   [key: string]: any;
// }
//
// export interface DataPostResponse {
//   /** @format uuid */
//   newDataElementId: string;
//   instance: Instance;
//   validationIssues: ValidationSourcePair[] | null;
//   newDataModels: DataModelPairResponse[] | null;
// }
//
// export interface DataType {
//   id?: string | null;
//   description?: Record<string, string>;
//   allowedContentTypes?: string[] | null;
//   allowedContributers?: string[] | null;
//   appLogic?: ApplicationLogic;
//   taskId?: string | null;
//   /** @format int32 */
//   maxSize?: number | null;
//   /**
//    * @format int32
//    * @default 1
//    */
//   maxCount?: number;
//   /**
//    * @format int32
//    * @default 1
//    */
//   minCount?: number;
//   grouping?: string | null;
//   enablePdfCreation?: boolean;
//   enableFileScan?: boolean;
//   validationErrorOnPendingFileScan?: boolean;
//   enabledFileAnalysers?: string[] | null;
//   enabledFileValidators?: string[] | null;
//   allowedKeysForUserDefinedMetadata?: string[] | null;
// }
//
// export interface DeleteStatus {
//   isHardDeleted?: boolean;
//   /** @format date-time */
//   hardDeleted?: string | null;
// }
//
// export interface EFormidlingContract {
//   serviceId?: string | null;
//   dpfShipmentType?: string | null;
//   receiver?: string | null;
//   sendAfterTaskId?: string | null;
//   process?: string | null;
//   standard?: string | null;
//   typeVersion?: string | null;
//   type?: string | null;
//   /** @format int32 */
//   securityLevel?: number;
//   dataTypes?: string[] | null;
// }
//
// export enum FileScanResult {
//   NotApplicable = "NotApplicable",
//   Pending = "Pending",
//   Clean = "Clean",
//   Infected = "Infected",
// }
//
// export interface HideSettings {
//   hideAlways?: boolean;
//   hideOnTask?: string[] | null;
// }
//
// export interface Instance {
//   /** @format date-time */
//   created?: string | null;
//   createdBy?: string | null;
//   /** @format date-time */
//   lastChanged?: string | null;
//   lastChangedBy?: string | null;
//   id?: string | null;
//   instanceOwner?: InstanceOwner;
//   appId?: string | null;
//   org?: string | null;
//   selfLinks?: ResourceLinks;
//   /** @format date-time */
//   dueBefore?: string | null;
//   /** @format date-time */
//   visibleAfter?: string | null;
//   process?: ProcessState;
//   status?: InstanceStatus;
//   completeConfirmations?: CompleteConfirmation[] | null;
//   data?: DataElement[] | null;
//   presentationTexts?: Record<string, string | null>;
//   dataValues?: Record<string, string | null>;
// }
//
// export interface InstanceFileScanResult {
//   id?: string | null;
//   fileScanResult?: FileScanResult;
//   data?: DataElementFileScanResult[] | null;
// }
//
// export interface InstanceOwner {
//   partyId?: string | null;
//   personNumber?: string | null;
//   organisationNumber?: string | null;
//   username?: string | null;
// }
//
// export interface InstanceSelection {
//   rowsPerPageOptions?: number[] | null;
//   /** @format int32 */
//   defaultRowsPerPage?: number | null;
//   /** @format int32 */
//   defaultSelectedOption?: number | null;
//   sortDirection?: string | null;
// }
//
// export interface InstanceStatus {
//   isArchived?: boolean;
//   /** @format date-time */
//   archived?: string | null;
//   isSoftDeleted?: boolean;
//   /** @format date-time */
//   softDeleted?: string | null;
//   isHardDeleted?: boolean;
//   /** @format date-time */
//   hardDeleted?: string | null;
//   readStatus?: ReadStatus;
//   substatus?: Substatus;
// }
//
// export interface InstansiationInstance {
//   instanceOwner?: InstanceOwner;
//   /** @format date-time */
//   dueBefore?: string | null;
//   /** @format date-time */
//   visibleAfter?: string | null;
//   prefill?: Record<string, string | null>;
//   sourceInstanceId?: string | null;
// }
//
// export interface InvoiceDetails {
//   invoiceNumber?: string | null;
// }
//
// export interface JsonNode {
//   options?: JsonNodeOptions;
//   parent?: JsonNode;
//   root?: JsonNode;
// }
//
// export interface JsonNodeOptions {
//   propertyNameCaseInsensitive?: boolean;
// }
//
// export interface JsonPatch {
//   operations?: PatchOperation[] | null;
// }
//
// export interface KeyValueEntry {
//   key?: string | null;
//   value?: string | null;
// }
//
// export interface Logo {
//   displayAppOwnerNameInHeader?: boolean;
//   source?: string | null;
//   size?: string | null;
// }
//
// export interface MessageBoxConfig {
//   hideSettings?: HideSettings;
// }
//
// export interface OnEntry {
//   show?: string | null;
//   instanceSelection?: InstanceSelection;
// }
//
// export interface OnEntryConfig {
//   show?: string | null;
// }
//
// export enum OperationType {
//   Unknown = "Unknown",
//   Add = "add",
//   Remove = "remove",
//   Replace = "replace",
//   Move = "move",
//   Copy = "copy",
//   Test = "test",
// }
//
// export interface OrderDetails {
//   paymentProcessorId: string | null;
//   receiver: PaymentReceiver;
//   payer?: Payer;
//   currency: string | null;
//   orderLines: PaymentOrderLine[] | null;
//   allowedPayerTypes?: PayerType[] | null;
//   orderReference?: string | null;
//   /** @format double */
//   totalPriceExVat?: number;
//   /** @format double */
//   totalVat?: number;
//   /** @format double */
//   totalPriceIncVat?: number;
// }
//
// export interface PartyTypesAllowed {
//   bankruptcyEstate?: boolean;
//   organisation?: boolean;
//   person?: boolean;
//   subUnit?: boolean;
// }
//
// export interface PatchListItem {
//   /** @format uuid */
//   dataElementId?: string;
//   patch?: JsonPatch;
// }
//
// export interface PatchOperation {
//   op?: OperationType;
//   from?: string[] | null;
//   path?: string[] | null;
//   value?: JsonNode;
// }
//
// export interface Payer {
//   privatePerson?: PayerPrivatePerson;
//   company?: PayerCompany;
//   shippingAddress?: Address;
//   billingAddress?: Address;
// }
//
// export interface PayerCompany {
//   organisationNumber?: string | null;
//   name?: string | null;
//   contactPerson?: PayerPrivatePerson;
// }
//
// export interface PayerPrivatePerson {
//   firstName?: string | null;
//   lastName?: string | null;
//   email?: string | null;
//   phoneNumber?: PhoneNumber;
// }
//
// export enum PayerType {
//   Person = "Person",
//   Company = "Company",
// }
//
// export interface PaymentDetails {
//   paymentId: string | null;
//   redirectUrl?: string | null;
//   payer?: Payer;
//   paymentType?: string | null;
//   paymentMethod?: string | null;
//   createdDate?: string | null;
//   chargedDate?: string | null;
//   invoiceDetails?: InvoiceDetails;
//   cardDetails?: CardDetails;
// }
//
// export interface PaymentInformation {
//   taskId: string | null;
//   status: PaymentStatus;
//   orderDetails: OrderDetails;
//   paymentDetails?: PaymentDetails;
// }
//
// export interface PaymentOrderLine {
//   id: string | null;
//   name: string | null;
//   textResourceKey?: string | null;
//   /** @format double */
//   priceExVat: number;
//   /** @format int32 */
//   quantity?: number;
//   /** @format double */
//   vatPercent: number;
//   unit?: string | null;
// }
//
// export interface PaymentReceiver {
//   organisationNumber?: string | null;
//   name?: string | null;
//   postalAddress?: Address;
//   bankAccountNumber?: string | null;
//   email?: string | null;
//   phoneNumber?: PhoneNumber;
// }
//
// export enum PaymentStatus {
//   Uninitialized = "Uninitialized",
//   Created = "Created",
//   Paid = "Paid",
//   Failed = "Failed",
//   Cancelled = "Cancelled",
//   Skipped = "Skipped",
// }
//
// export interface PhoneNumber {
//   prefix?: string | null;
//   number?: string | null;
// }
//
// export interface ProblemDetails {
//   type?: string | null;
//   title?: string | null;
//   /** @format int32 */
//   status?: number | null;
//   detail?: string | null;
//   instance?: string | null;
//   [key: string]: any;
// }
//
// export interface ProcessElementInfo {
//   /** @format int32 */
//   flow?: number | null;
//   /** @format date-time */
//   started?: string | null;
//   elementId?: string | null;
//   name?: string | null;
//   altinnTaskType?: string | null;
//   /** @format date-time */
//   ended?: string | null;
//   validated?: ValidationStatus;
//   flowType?: string | null;
// }
//
// export interface ProcessHistoryItem {
//   eventType?: string | null;
//   elementId?: string | null;
//   /** @format date-time */
//   occured?: string | null;
//   /** @format date-time */
//   started?: string | null;
//   /** @format date-time */
//   ended?: string | null;
//   performedBy?: string | null;
// }
//
// export interface ProcessHistoryList {
//   processHistory?: ProcessHistoryItem[] | null;
// }
//
// export interface ProcessNext {
//   action?: string | null;
// }
//
// export interface ProcessState {
//   /** @format date-time */
//   started?: string | null;
//   startEvent?: string | null;
//   currentTask?: ProcessElementInfo;
//   /** @format date-time */
//   ended?: string | null;
//   endEvent?: string | null;
// }
//
// /** @format int32 */
// export enum ReadStatus {
//   Value0 = 0,
//   Value1 = 1,
//   Value2 = 2,
// }
//
// export interface Reference {
//   value?: string | null;
//   relation?: RelationType;
//   valueType?: ReferenceType;
// }
//
// export enum ReferenceType {
//   DataElement = "DataElement",
//   Task = "Task",
// }
//
// export enum RelationType {
//   GeneratedFrom = "GeneratedFrom",
// }
//
// export interface ResourceLinks {
//   apps?: string | null;
//   platform?: string | null;
// }
//
// export interface ShadowFields {
//   prefix?: string | null;
//   saveToDataType?: string | null;
// }
//
// export interface SimpleInstance {
//   id?: string | null;
//   presentationTexts?: Record<string, string>;
//   /** @format date-time */
//   dueBefore?: string | null;
//   /** @format date-time */
//   lastChanged?: string | null;
//   lastChangedBy?: string | null;
// }
//
// export interface Substatus {
//   label?: string | null;
//   description?: string | null;
// }
//
// export interface TagsList {
//   tags?: string[] | null;
// }
//
// export interface TextResource {
//   id?: string | null;
//   org?: string | null;
//   language?: string | null;
//   resources?: TextResourceElement[] | null;
// }
//
// export interface TextResourceElement {
//   id?: string | null;
//   value?: string | null;
//   variables?: TextResourceVariable[] | null;
// }
//
// export interface TextResourceVariable {
//   key?: string | null;
//   dataSource?: string | null;
//   defaultValue?: string | null;
// }
//
// export interface UserAction {
//   id: string | null;
//   authorized?: boolean;
//   type?: ActionType;
// }
//
// export interface UserActionRequest {
//   action?: string | null;
//   buttonId?: string | null;
//   metadata?: Record<string, string>;
//   ignoredValidators?: string[] | null;
// }
//
// export interface UserActionResponse {
//   instance: Instance;
//   updatedDataModels?: Record<string, any>;
//   updatedValidationIssues?: Record<string, Record<string, ValidationIssueWithSource[]>>;
//   clientActions?: ClientAction[] | null;
//   error?: ActionError;
//   /** @format uri */
//   redirectUrl?: string | null;
// }
//
// export interface UserDefinedMetadataDto {
//   userDefinedMetadata?: KeyValueEntry[] | null;
// }
//
// /** @format int32 */
// export enum ValidationIssueSeverity {
//   Value0 = 0,
//   Value1 = 1,
//   Value2 = 2,
//   Value3 = 3,
//   Value4 = 4,
//   Value5 = 5,
// }
//
// export interface ValidationIssueWithSource {
//   severity: ValidationIssueSeverity;
//   dataElementId?: string | null;
//   field?: string | null;
//   code: string | null;
//   description: string | null;
//   source: string | null;
//   noIncrementalUpdates?: boolean;
//   customTextKey?: string | null;
//   customTextParams?: string[] | null;
// }
//
// export interface ValidationSourcePair {
//   source?: string | null;
//   issues?: ValidationIssueWithSource[] | null;
// }
//
// export interface ValidationStatus {
//   /** @format date-time */
//   timestamp?: string | null;
//   canCompleteTask?: boolean;
// }
//
// export type QueryParamsType = Record<string | number, any>;
// export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;
//
// export interface FullRequestParams extends Omit<RequestInit, "body"> {
//   /** set parameter to `true` for call `securityWorker` for this request */
//   secure?: boolean;
//   /** request path */
//   path: string;
//   /** content type of request body */
//   type?: ContentType;
//   /** query params */
//   query?: QueryParamsType;
//   /** format of response (i.e. response.json() -> format: "json") */
//   format?: ResponseFormat;
//   /** request body */
//   body?: unknown;
//   /** base url */
//   baseUrl?: string;
//   /** request cancellation token */
//   cancelToken?: CancelToken;
// }
//
// export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;
//
// export interface ApiConfig<SecurityDataType = unknown> {
//   baseUrl?: string;
//   baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
//   securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
//   customFetch?: typeof fetch;
// }
//
// export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
//   data: D;
//   error: E;
// }
//
// type CancelToken = Symbol | string | number;
//
// export enum ContentType {
//   Json = "application/json",
//   FormData = "multipart/form-data",
//   UrlEncoded = "application/x-www-form-urlencoded",
//   Text = "text/plain",
// }
//
// export class HttpClient<SecurityDataType = unknown> {
//   public baseUrl: string = "";
//   private securityData: SecurityDataType | null = null;
//   private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
//   private abortControllers = new Map<CancelToken, AbortController>();
//   private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);
//
//   private baseApiParams: RequestParams = {
//     credentials: "same-origin",
//     headers: {},
//     redirect: "follow",
//     referrerPolicy: "no-referrer",
//   };
//
//   constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
//     Object.assign(this, apiConfig);
//   }
//
//   public setSecurityData = (data: SecurityDataType | null) => {
//     this.securityData = data;
//   };
//
//   protected encodeQueryParam(key: string, value: any) {
//     const encodedKey = encodeURIComponent(key);
//     return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
//   }
//
//   protected addQueryParam(query: QueryParamsType, key: string) {
//     return this.encodeQueryParam(key, query[key]);
//   }
//
//   protected addArrayQueryParam(query: QueryParamsType, key: string) {
//     const value = query[key];
//     return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
//   }
//
//   protected toQueryString(rawQuery?: QueryParamsType): string {
//     const query = rawQuery || {};
//     const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
//     return keys
//       .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
//       .join("&");
//   }
//
//   protected addQueryParams(rawQuery?: QueryParamsType): string {
//     const queryString = this.toQueryString(rawQuery);
//     return queryString ? `?${queryString}` : "";
//   }
//
//   private contentFormatters: Record<ContentType, (input: any) => any> = {
//     [ContentType.Json]: (input: any) =>
//       input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
//     [ContentType.Text]: (input: any) => (input !== null && typeof input !== "string" ? JSON.stringify(input) : input),
//     [ContentType.FormData]: (input: any) =>
//       Object.keys(input || {}).reduce((formData, key) => {
//         const property = input[key];
//         formData.append(
//           key,
//           property instanceof Blob
//             ? property
//             : typeof property === "object" && property !== null
//               ? JSON.stringify(property)
//               : `${property}`,
//         );
//         return formData;
//       }, new FormData()),
//     [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
//   };
//
//   protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
//     return {
//       ...this.baseApiParams,
//       ...params1,
//       ...(params2 || {}),
//       headers: {
//         ...(this.baseApiParams.headers || {}),
//         ...(params1.headers || {}),
//         ...((params2 && params2.headers) || {}),
//       },
//     };
//   }
//
//   protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
//     if (this.abortControllers.has(cancelToken)) {
//       const abortController = this.abortControllers.get(cancelToken);
//       if (abortController) {
//         return abortController.signal;
//       }
//       return void 0;
//     }
//
//     const abortController = new AbortController();
//     this.abortControllers.set(cancelToken, abortController);
//     return abortController.signal;
//   };
//
//   public abortRequest = (cancelToken: CancelToken) => {
//     const abortController = this.abortControllers.get(cancelToken);
//
//     if (abortController) {
//       abortController.abort();
//       this.abortControllers.delete(cancelToken);
//     }
//   };
//
//   public request = async <T = any, E = any>({
//                                               body,
//                                               secure,
//                                               path,
//                                               type,
//                                               query,
//                                               format,
//                                               baseUrl,
//                                               cancelToken,
//                                               ...params
//                                             }: FullRequestParams): Promise<HttpResponse<T, E>> => {
//     const secureParams =
//       ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
//         this.securityWorker &&
//         (await this.securityWorker(this.securityData))) ||
//       {};
//     const requestParams = this.mergeRequestParams(params, secureParams);
//     const queryString = query && this.toQueryString(query);
//     const payloadFormatter = this.contentFormatters[type || ContentType.Json];
//     const responseFormat = format || requestParams.format;
//
//     return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
//       ...requestParams,
//       headers: {
//         ...(requestParams.headers || {}),
//         ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
//       },
//       signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
//       body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
//     }).then(async (response) => {
//       const r = response.clone() as HttpResponse<T, E>;
//       r.data = null as unknown as T;
//       r.error = null as unknown as E;
//
//       const data = !responseFormat
//         ? r
//         : await response[responseFormat]()
//           .then((data) => {
//             if (r.ok) {
//               r.data = data;
//             } else {
//               r.error = data;
//             }
//             return r;
//           })
//           .catch((e) => {
//             r.error = e;
//             return r;
//           });
//
//       if (cancelToken) {
//         this.abortControllers.delete(cancelToken);
//       }
//
//       if (!response.ok) throw data;
//       return data;
//     });
//   };
// }
//
// /**
//  * @title Altinn App Api
//  * @version v1
//  */
// export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
//   org = {
//     /**
//      * No description
//      *
//      * @tags Actions
//      * @name ActionsCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions
//      */
//     actionsCreate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       data: UserActionRequest,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<UserActionResponse, ProblemDetails | void>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/actions`,
//         method: "POST",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ApplicationLanguage
//      * @name V1ApplicationlanguagesDetail
//      * @request GET:/{org}/{app}/api/v1/applicationlanguages
//      */
//     v1ApplicationlanguagesDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<ApplicationLanguage[], void>({
//         path: `/${org}/${app}/api/v1/applicationlanguages`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ApplicationMetadata
//      * @name V1ApplicationmetadataDetail
//      * @request GET:/{org}/{app}/api/v1/applicationmetadata
//      */
//     v1ApplicationmetadataDetail: (
//       org: string,
//       app: string,
//       query?: {
//         /** @default true */
//         checkOrgApp?: boolean;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<ApplicationMetadata, any>({
//         path: `/${org}/${app}/api/v1/applicationmetadata`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ApplicationMetadata
//      * @name V1MetaAuthorizationpolicyDetail
//      * @request GET:/{org}/{app}/api/v1/meta/authorizationpolicy
//      */
//     v1MetaAuthorizationpolicyDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<string, any>({
//         path: `/${org}/${app}/api/v1/meta/authorizationpolicy`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ApplicationMetadata
//      * @name V1MetaProcessDetail
//      * @request GET:/{org}/{app}/api/v1/meta/process
//      */
//     v1MetaProcessDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<string, any>({
//         path: `/${org}/${app}/api/v1/meta/process`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ApplicationSettings
//      * @name V1ApplicationsettingsDetail
//      * @request GET:/{org}/{app}/api/v1/applicationsettings
//      */
//     v1ApplicationsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/applicationsettings`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Authentication
//      * @name AuthenticationKeepAliveDetail
//      * @request GET:/{org}/{app}/api/Authentication/keepAlive
//      */
//     authenticationKeepAliveDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/Authentication/keepAlive`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Authentication
//      * @name AuthenticationInvalidatecookieUpdate
//      * @request PUT:/{org}/{app}/api/Authentication/invalidatecookie
//      */
//     authenticationInvalidatecookieUpdate: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/Authentication/invalidatecookie`,
//         method: "PUT",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Authorization
//      * @name AuthorizationPartiesCurrentDetail
//      * @request GET:/{org}/{app}/api/authorization/parties/current
//      */
//     authorizationPartiesCurrentDetail: (
//       org: string,
//       app: string,
//       query?: {
//         /** @default false */
//         returnPartyObject?: boolean;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/authorization/parties/current`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
//      * @deprecated
//      */
//     dataCreate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         dataType?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataElement, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataPartialUpdate
//      * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
//      */
//     dataPartialUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       data: DataPatchRequestMultiple,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataPatchResponseMultiple, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
//         method: "PATCH",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataCreate2
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataType}
//      * @originalName dataCreate
//      * @duplicate
//      */
//     dataCreate2: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataType: string,
//       query?: {
//         ignoredValidators?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataPostResponse, DataPostErrorResponse | ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataType}`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
//      */
//     dataDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       query?: {
//         /** @default false */
//         includeRowId?: boolean;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataUpdate
//      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
//      */
//     dataUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<CalculationResult, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
//         method: "PUT",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataPartialUpdate2
//      * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
//      * @deprecated
//      * @originalName dataPartialUpdate
//      * @duplicate
//      */
//     dataPartialUpdate2: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       data: DataPatchRequest,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataPatchResponse, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
//         method: "PATCH",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Data
//      * @name DataDelete
//      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
//      */
//     dataDelete: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       query?: {
//         ignoredValidators?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataPostResponse, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
//         method: "DELETE",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags DataLists
//      * @name DatalistsDetail
//      * @request GET:/{org}/{app}/api/datalists/{id}
//      */
//     datalistsDetail: (
//       id: string,
//       org: string,
//       app: string,
//       query?: {
//         queryParams?: Record<string, string>;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/datalists/${id}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags DataLists
//      * @name DatalistsDetail2
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/datalists/{id}
//      * @originalName datalistsDetail
//      * @duplicate
//      */
//     datalistsDetail2: (
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       id: string,
//       org: string,
//       app: string,
//       query?: {
//         queryParams?: Record<string, string>;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/datalists/${id}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags DataTags
//      * @name DataTagsDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
//      */
//     dataTagsDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<TagsList, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags DataTags
//      * @name DataTagsCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
//      */
//     dataTagsCreate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       data: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<TagsList, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
//         method: "POST",
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags DataTags
//      * @name DataTagsDelete
//      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags/{tag}
//      */
//     dataTagsDelete: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       tag: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags/${tag}`,
//         method: "DELETE",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags EventsReceiver
//      * @name V1EventsreceiverCreate
//      * @request POST:/{org}/{app}/api/v1/eventsreceiver
//      */
//     v1EventsreceiverCreate: (
//       org: string,
//       app: string,
//       data: CloudEvent,
//       query?: {
//         code?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, void>({
//         path: `/${org}/${app}/api/v1/eventsreceiver`,
//         method: "POST",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags ExternalApi
//      * @name ApiExternalDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/api/external/{externalApiId}
//      */
//     apiExternalDetail: (
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       externalApiId: string,
//       org: string,
//       app: string,
//       query?: {
//         queryParams?: Record<string, string>;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/api/external/${externalApiId}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags FileScan
//      * @name FilescanresultDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/filescanresult
//      */
//     filescanresultDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<InstanceFileScanResult, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/filescanresult`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Home
//      * @name GetOrg
//      * @request GET:/{org}/{app}
//      */
//     getOrg: (
//       org: string,
//       app: string,
//       query?: {
//         dontChooseReportee?: boolean;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name InstancesDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
//      */
//     instancesDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<Instance, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name InstancesDelete
//      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
//      */
//     instancesDelete: (
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       org: string,
//       app: string,
//       query?: {
//         hard?: boolean;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<Instance, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
//         method: "DELETE",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name InstancesCreate
//      * @request POST:/{org}/{app}/instances
//      */
//     instancesCreate: (
//       org: string,
//       app: string,
//       query?: {
//         /** @format int32 */
//         instanceOwnerPartyId?: number;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<Instance, ProblemDetails>({
//         path: `/${org}/${app}/instances`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     // instancesCreate: (
//     //   org: string,
//     //   app: string,
//     //   query?: {
//     //     /** @format int32 */
//     //     instanceOwnerPartyId?: number;
//     //     language?: string;
//     //   },
//     //   params: RequestParams = {},
//     // ) =>
//     //   this.request<Instance, ProblemDetails>({
//     //     path: `/${org}/${app}/instances`,
//     //     method: "POST",
//     //     query: query,
//     //     headers: {
//     //       // from the second request
//     //       Accept: 'application/json, text/plain, */*',
//     //       'Accept-Language': 'en,nb;q=0.9,no;q=0.8,sv;q=0.7',
//     //       Referer: 'http://local.altinn.cloud/krt/krt-3010a-1/',
//     //       // you can add Content-Length: '0' if your request library doesn't set it automatically
//     //       // "Content-Length": "0"
//     //     },
//     //     format: "json",
//     //     ...params,
//     //   }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name CreateCreate
//      * @request POST:/{org}/{app}/instances/create
//      */
//     createCreate: (org: string, app: string, data: InstansiationInstance, params: RequestParams = {}) =>
//       this.request<Instance, ProblemDetails>({
//         path: `/${org}/${app}/instances/create`,
//         method: "POST",
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name CompleteCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete
//      */
//     completeCreate: (
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       org: string,
//       app: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<Instance, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/complete`,
//         method: "POST",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name SubstatusUpdate
//      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus
//      */
//     substatusUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       data: Substatus,
//       params: RequestParams = {},
//     ) =>
//       this.request<Instance, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/substatus`,
//         method: "PUT",
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Instances
//      * @name ActiveDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/active
//      */
//     activeDetail: (org: string, app: string, instanceOwnerPartyId: number, params: RequestParams = {}) =>
//       this.request<SimpleInstance[], any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/active`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Options
//      * @name OptionsDetail
//      * @request GET:/{org}/{app}/api/options/{optionsId}
//      */
//     optionsDetail: (
//       optionsId: string,
//       org: string,
//       app: string,
//       query?: {
//         queryParams?: Record<string, string>;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/options/${optionsId}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Options
//      * @name OptionsDetail2
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/{optionsId}
//      * @originalName optionsDetail
//      * @duplicate
//      */
//     optionsDetail2: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       optionsId: string,
//       query?: {
//         language?: string;
//         queryParams?: Record<string, string>;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/options/${optionsId}`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Pages
//      * @name PagesOrderCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/pages/order
//      * @deprecated
//      */
//     pagesOrderCreate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       data: any,
//       query?: {
//         layoutSetId?: string;
//         currentPage?: string;
//         dataTypeId?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<string[], any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/pages/order`,
//         method: "POST",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Parties
//      * @name V1PartiesDetail
//      * @request GET:/{org}/{app}/api/v1/parties
//      */
//     v1PartiesDetail: (
//       org: string,
//       app: string,
//       query?: {
//         /** @default false */
//         allowedToInstantiateFilter?: boolean;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/parties`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Parties
//      * @name V1PartiesValidateInstantiationCreate
//      * @request POST:/{org}/{app}/api/v1/parties/validateInstantiation
//      */
//     v1PartiesValidateInstantiationCreate: (
//       org: string,
//       app: string,
//       query?: {
//         /** @format int32 */
//         partyId?: number;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/parties/validateInstantiation`,
//         method: "POST",
//         query: query,
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Parties
//      * @name V1PartiesUpdate
//      * @request PUT:/{org}/{app}/api/v1/parties/{partyId}
//      */
//     v1PartiesUpdate: (partyId: number, org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/parties/${partyId}`,
//         method: "PUT",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Payment
//      * @name PaymentDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment
//      */
//     paymentDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<PaymentInformation, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Payment
//      * @name PaymentOrderDetailsDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment/order-details
//      */
//     paymentOrderDetailsDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<OrderDetails, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment/order-details`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Pdf
//      * @name DataPdfFormatDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/pdf/format
//      */
//     dataPdfFormatDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/pdf/format`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process
//      */
//     processDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<AppProcessState, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessStartCreate
//      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/start
//      */
//     processStartCreate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         startEvent?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<AppProcessState, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/start`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessNextDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
//      * @deprecated
//      */
//     processNextDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<string[], ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessNextUpdate
//      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
//      */
//     processNextUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       data: ProcessNext,
//       query?: {
//         elementId?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<AppProcessState, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
//         method: "PUT",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessCompleteProcessUpdate
//      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/completeProcess
//      */
//     processCompleteProcessUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<AppProcessState, ProblemDetails>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/completeProcess`,
//         method: "PUT",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Process
//      * @name ProcessHistoryDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/history
//      */
//     processHistoryDetail: (
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       org: string,
//       app: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<ProcessHistoryList, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/history`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Profile
//      * @name V1ProfileUserDetail
//      * @request GET:/{org}/{app}/api/v1/profile/user
//      */
//     v1ProfileUserDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/profile/user`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Redirect
//      * @name V1RedirectDetail
//      * @request GET:/{org}/{app}/api/v1/redirect
//      */
//     v1RedirectDetail: (
//       org: string,
//       app: string,
//       query: {
//         url: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<string, ProblemDetails>({
//         path: `/${org}/${app}/api/v1/redirect`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsAllSettingsDetail
//      * @request GET:/{org}/{app}/api/layouts/all-settings/{id}
//      */
//     layoutsAllSettingsDetail: (id: string, org: string, app: string, params: RequestParams = {}) =>
//       this.request<AllLayoutSettingsDTO, any>({
//         path: `/${org}/${app}/api/layouts/all-settings/${id}`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name JsonschemaDetail
//      * @request GET:/{org}/{app}/api/jsonschema/{id}
//      */
//     jsonschemaDetail: (id: string, org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/jsonschema/${id}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsDetail
//      * @request GET:/{org}/{app}/api/layouts
//      */
//     layoutsDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/layouts`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsDetail2
//      * @request GET:/{org}/{app}/api/layouts/{id}
//      * @originalName layoutsDetail
//      * @duplicate
//      */
//     layoutsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/layouts/${id}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsettingsDetail
//      * @request GET:/{org}/{app}/api/layoutsettings
//      */
//     layoutsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/layoutsettings`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsettingsDetail2
//      * @request GET:/{org}/{app}/api/layoutsettings/{id}
//      * @originalName layoutsettingsDetail
//      * @duplicate
//      */
//     layoutsettingsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/layoutsettings/${id}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name LayoutsetsDetail
//      * @request GET:/{org}/{app}/api/layoutsets
//      */
//     layoutsetsDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/layoutsets`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name RulehandlerDetail
//      * @request GET:/{org}/{app}/api/rulehandler/{id}
//      */
//     rulehandlerDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/rulehandler/${id}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name RuleconfigurationDetail
//      * @request GET:/{org}/{app}/api/ruleconfiguration/{id}
//      */
//     ruleconfigurationDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/ruleconfiguration/${id}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name V1FooterDetail
//      * @request GET:/{org}/{app}/api/v1/footer
//      */
//     v1FooterDetail: (org: string, app: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/v1/footer`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Resource
//      * @name ValidationconfigDetail
//      * @request GET:/{org}/{app}/api/validationconfig/{dataTypeId}
//      */
//     validationconfigDetail: (org: string, app: string, dataTypeId: string, params: RequestParams = {}) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/api/validationconfig/${dataTypeId}`,
//         method: "GET",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags StatelessData
//      * @name DataDetail2
//      * @request GET:/{org}/{app}/v1/data
//      * @originalName dataDetail
//      * @duplicate
//      */
//     dataDetail2: (
//       org: string,
//       app: string,
//       query?: {
//         dataType?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataElement, any>({
//         path: `/${org}/${app}/v1/data`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags StatelessData
//      * @name DataCreate3
//      * @request POST:/{org}/{app}/v1/data
//      * @originalName dataCreate
//      * @duplicate
//      */
//     dataCreate3: (
//       org: string,
//       app: string,
//       query?: {
//         dataType?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataElement, any>({
//         path: `/${org}/${app}/v1/data`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags StatelessData
//      * @name DataAnonymousDetail
//      * @request GET:/{org}/{app}/v1/data/anonymous
//      */
//     dataAnonymousDetail: (
//       org: string,
//       app: string,
//       query?: {
//         dataType?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataElement, any>({
//         path: `/${org}/${app}/v1/data/anonymous`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags StatelessData
//      * @name DataAnonymousCreate
//      * @request POST:/{org}/{app}/v1/data/anonymous
//      */
//     dataAnonymousCreate: (
//       org: string,
//       app: string,
//       query?: {
//         dataType?: string;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<DataElement, any>({
//         path: `/${org}/${app}/v1/data/anonymous`,
//         method: "POST",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags StatelessPages
//      * @name PagesOrderCreate2
//      * @request POST:/{org}/{app}/v1/pages/order
//      * @deprecated
//      * @originalName pagesOrderCreate
//      * @duplicate
//      */
//     pagesOrderCreate2: (
//       org: string,
//       app: string,
//       data: any,
//       query?: {
//         layoutSetId?: string;
//         currentPage?: string;
//         dataTypeId?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<string[], any>({
//         path: `/${org}/${app}/v1/pages/order`,
//         method: "POST",
//         query: query,
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Texts
//      * @name V1TextsDetail
//      * @request GET:/{org}/{app}/api/v1/texts/{language}
//      */
//     v1TextsDetail: (org: string, app: string, language: string, params: RequestParams = {}) =>
//       this.request<TextResource, any>({
//         path: `/${org}/${app}/api/v1/texts/${language}`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags UserDefinedMetadata
//      * @name DataUserDefinedMetadataDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
//      */
//     dataUserDefinedMetadataDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       params: RequestParams = {},
//     ) =>
//       this.request<UserDefinedMetadataDto, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
//         method: "GET",
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags UserDefinedMetadata
//      * @name DataUserDefinedMetadataUpdate
//      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
//      */
//     dataUserDefinedMetadataUpdate: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       dataGuid: string,
//       data: UserDefinedMetadataDto,
//       params: RequestParams = {},
//     ) =>
//       this.request<UserDefinedMetadataDto, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
//         method: "PUT",
//         body: data,
//         type: ContentType.Json,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Validate
//      * @name ValidateDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate
//      */
//     validateDetail: (
//       org: string,
//       app: string,
//       instanceOwnerPartyId: number,
//       instanceGuid: string,
//       query?: {
//         ignoredValidators?: string;
//         onlyIncrementalValidators?: boolean;
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<ValidationIssueWithSource, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/validate`,
//         method: "GET",
//         query: query,
//         format: "json",
//         ...params,
//       }),
//
//     /**
//      * No description
//      *
//      * @tags Validate
//      * @name DataValidateDetail
//      * @request GET:/{org}/{app}/instances/{instanceOwnerId}/{instanceId}/data/{dataGuid}/validate
//      * @deprecated
//      */
//     dataValidateDetail: (
//       org: string,
//       app: string,
//       instanceOwnerId: number,
//       instanceId: string,
//       dataGuid: string,
//       query?: {
//         language?: string;
//       },
//       params: RequestParams = {},
//     ) =>
//       this.request<void, any>({
//         path: `/${org}/${app}/instances/${instanceOwnerId}/${instanceId}/data/${dataGuid}/validate`,
//         method: "GET",
//         query: query,
//         ...params,
//       }),
//   };
// }
//
//
//
// // /* eslint-disable */
// // /* tslint:disable */
// // /*
// //  * ---------------------------------------------------------------
// //  * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
// //  * ##                                                           ##
// //  * ## AUTHOR: acacode                                           ##
// //  * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
// //  * ---------------------------------------------------------------
// //  */
// //
// // export interface ActionError {
// //   code?: string | null;
// //   message?: string | null;
// //   metadata?: Record<string, string>;
// // }
// //
// // /** @format int32 */
// // export enum ActionType {
// //   Value0 = 0,
// //   Value1 = 1,
// // }
// //
// // export interface Address {
// //   name?: string | null;
// //   addressLine1?: string | null;
// //   addressLine2?: string | null;
// //   postalCode?: string | null;
// //   city?: string | null;
// //   country?: string | null;
// // }
// //
// // export interface AppProcessElementInfo {
// //   /** @format int32 */
// //   flow?: number | null;
// //   /** @format date-time */
// //   started?: string | null;
// //   elementId?: string | null;
// //   name?: string | null;
// //   altinnTaskType?: string | null;
// //   /** @format date-time */
// //   ended?: string | null;
// //   validated?: ValidationStatus;
// //   flowType?: string | null;
// //   actions?: Record<string, boolean>;
// //   userActions?: UserAction[] | null;
// //   read?: boolean;
// //   write?: boolean;
// // }
// //
// // export interface AppProcessState {
// //   /** @format date-time */
// //   started?: string | null;
// //   startEvent?: string | null;
// //   currentTask?: AppProcessElementInfo;
// //   /** @format date-time */
// //   ended?: string | null;
// //   endEvent?: string | null;
// //   processTasks?: AppProcessTaskTypeInfo[] | null;
// // }
// //
// // export interface AppProcessTaskTypeInfo {
// //   altinnTaskType?: string | null;
// //   elementId?: string | null;
// // }
// //
// // export interface ApplicationLanguage {
// //   language?: string | null;
// // }
// //
// // export interface ApplicationLogic {
// //   autoCreate?: boolean | null;
// //   classRef?: string | null;
// //   schemaRef?: string | null;
// //   allowAnonymousOnStateless?: boolean;
// //   autoDeleteOnProcessEnd?: boolean;
// //   disallowUserCreate?: boolean;
// //   disallowUserDelete?: boolean;
// //   allowInSubform?: boolean;
// //   shadowFields?: ShadowFields;
// // }
// //
// // export interface ApplicationMetadata {
// //   /** @format date-time */
// //   created?: string | null;
// //   createdBy?: string | null;
// //   /** @format date-time */
// //   lastChanged?: string | null;
// //   lastChangedBy?: string | null;
// //   versionId?: string | null;
// //   org?: string | null;
// //   title?: Record<string, string | null>;
// //   /** @format date-time */
// //   validFrom?: string | null;
// //   /** @format date-time */
// //   validTo?: string | null;
// //   processId?: string | null;
// //   dataTypes?: DataType[] | null;
// //   partyTypesAllowed?: PartyTypesAllowed;
// //   autoDeleteOnProcessEnd?: boolean;
// //   presentationFields?: DataField[] | null;
// //   dataFields?: DataField[] | null;
// //   eFormidling?: EFormidlingContract;
// //   onEntry?: OnEntry;
// //   messageBoxConfig?: MessageBoxConfig;
// //   copyInstanceSettings?: CopyInstanceSettings;
// //   /** @format int32 */
// //   storageAccountNumber?: number | null;
// //   disallowUserInstantiation?: boolean;
// //   id?: string | null;
// //   features?: Record<string, boolean>;
// //   logo?: Logo;
// //   altinnNugetVersion?: string | null;
// //   externalApiIds?: string[] | null;
// //   [key: string]: any;
// // }
// //
// // export interface CalculationResult {
// //   /** @format date-time */
// //   created?: string | null;
// //   createdBy?: string | null;
// //   /** @format date-time */
// //   lastChanged?: string | null;
// //   lastChangedBy?: string | null;
// //   id?: string | null;
// //   instanceGuid?: string | null;
// //   dataType?: string | null;
// //   filename?: string | null;
// //   contentType?: string | null;
// //   blobStoragePath?: string | null;
// //   selfLinks?: ResourceLinks;
// //   /** @format int64 */
// //   size?: number;
// //   contentHash?: string | null;
// //   locked?: boolean;
// //   refs?: string[] | null;
// //   isRead?: boolean;
// //   tags?: string[] | null;
// //   userDefinedMetadata?: KeyValueEntry[] | null;
// //   metadata?: KeyValueEntry[] | null;
// //   deleteStatus?: DeleteStatus;
// //   fileScanResult?: FileScanResult;
// //   references?: Reference[] | null;
// //   changedFields?: Record<string, any>;
// // }
// //
// // export interface CardDetails {
// //   maskedPan?: string | null;
// //   expiryDate?: string | null;
// // }
// //
// // export interface ClientAction {
// //   id?: string | null;
// //   metadata?: Record<string, any>;
// // }
// //
// // export interface CloudEvent {
// //   id?: string | null;
// //   /** @format uri */
// //   source?: string | null;
// //   specversion?: string | null;
// //   type?: string | null;
// //   subject?: string | null;
// //   /** @format date-time */
// //   time?: string;
// //   alternativesubject?: string | null;
// //   data?: any;
// //   /** @format uri */
// //   dataschema?: string | null;
// //   contenttype?: ContentType1;
// // }
// //
// // export interface CompleteConfirmation {
// //   stakeholderId?: string | null;
// //   /** @format date-time */
// //   confirmedOn?: string;
// // }
// //
// // export interface ContentType1 {
// //   boundary?: string | null;
// //   charSet?: string | null;
// //   mediaType?: string | null;
// //   name?: string | null;
// //   parameters?: any[] | null;
// // }
// //
// // export interface CopyInstanceSettings {
// //   enabled?: boolean;
// //   excludedDataTypes?: string[] | null;
// //   excludedDataFields?: string[] | null;
// // }
// //
// // export interface DataElement {
// //   /** @format date-time */
// //   created?: string | null;
// //   createdBy?: string | null;
// //   /** @format date-time */
// //   lastChanged?: string | null;
// //   lastChangedBy?: string | null;
// //   id?: string | null;
// //   instanceGuid?: string | null;
// //   dataType?: string | null;
// //   filename?: string | null;
// //   contentType?: string | null;
// //   blobStoragePath?: string | null;
// //   selfLinks?: ResourceLinks;
// //   /** @format int64 */
// //   size?: number;
// //   contentHash?: string | null;
// //   locked?: boolean;
// //   refs?: string[] | null;
// //   isRead?: boolean;
// //   tags?: string[] | null;
// //   userDefinedMetadata?: KeyValueEntry[] | null;
// //   metadata?: KeyValueEntry[] | null;
// //   deleteStatus?: DeleteStatus;
// //   fileScanResult?: FileScanResult;
// //   references?: Reference[] | null;
// // }
// //
// // export interface DataElementFileScanResult {
// //   id?: string | null;
// //   fileScanResult?: FileScanResult;
// // }
// //
// // export interface DataField {
// //   id?: string | null;
// //   path?: string | null;
// //   dataTypeId?: string | null;
// // }
// //
// // export interface DataModelPairResponse {
// //   /** @format uuid */
// //   dataElementId?: string;
// //   data?: any;
// // }
// //
// // export interface DataPatchRequest {
// //   patch: JsonPatch;
// //   ignoredValidators: string[] | null;
// // }
// //
// // export interface DataPatchRequestMultiple {
// //   patches: PatchListItem[] | null;
// //   ignoredValidators: string[] | null;
// // }
// //
// // export interface DataPatchResponse {
// //   validationIssues: Record<string, ValidationIssueWithSource[]>;
// //   newDataModel: any;
// //   instance: Instance;
// // }
// //
// // export interface DataPatchResponseMultiple {
// //   validationIssues: ValidationSourcePair[] | null;
// //   newDataModels: DataModelPairResponse[] | null;
// //   instance: Instance;
// // }
// //
// // export interface DataPostErrorResponse {
// //   type?: string | null;
// //   title?: string | null;
// //   /** @format int32 */
// //   status?: number | null;
// //   detail?: string | null;
// //   instance?: string | null;
// //   uploadValidationIssues?: ValidationIssueWithSource[] | null;
// //   [key: string]: any;
// // }
// //
// // export interface DataPostResponse {
// //   /** @format uuid */
// //   newDataElementId: string;
// //   instance: Instance;
// //   validationIssues: ValidationSourcePair[] | null;
// //   newDataModels: DataModelPairResponse[] | null;
// // }
// //
// // export interface DataType {
// //   id?: string | null;
// //   description?: Record<string, string>;
// //   allowedContentTypes?: string[] | null;
// //   allowedContributers?: string[] | null;
// //   appLogic?: ApplicationLogic;
// //   taskId?: string | null;
// //   /** @format int32 */
// //   maxSize?: number | null;
// //   /**
// //    * @format int32
// //    * @default 1
// //    */
// //   maxCount?: number;
// //   /**
// //    * @format int32
// //    * @default 1
// //    */
// //   minCount?: number;
// //   grouping?: string | null;
// //   enablePdfCreation?: boolean;
// //   enableFileScan?: boolean;
// //   validationErrorOnPendingFileScan?: boolean;
// //   enabledFileAnalysers?: string[] | null;
// //   enabledFileValidators?: string[] | null;
// //   allowedKeysForUserDefinedMetadata?: string[] | null;
// // }
// //
// // export interface DeleteStatus {
// //   isHardDeleted?: boolean;
// //   /** @format date-time */
// //   hardDeleted?: string | null;
// // }
// //
// // export interface EFormidlingContract {
// //   serviceId?: string | null;
// //   dpfShipmentType?: string | null;
// //   receiver?: string | null;
// //   sendAfterTaskId?: string | null;
// //   process?: string | null;
// //   standard?: string | null;
// //   typeVersion?: string | null;
// //   type?: string | null;
// //   /** @format int32 */
// //   securityLevel?: number;
// //   dataTypes?: string[] | null;
// // }
// //
// // export enum FileScanResult {
// //   NotApplicable = "NotApplicable",
// //   Pending = "Pending",
// //   Clean = "Clean",
// //   Infected = "Infected",
// // }
// //
// // export interface HideSettings {
// //   hideAlways?: boolean;
// //   hideOnTask?: string[] | null;
// // }
// //
// // export interface Instance {
// //   /** @format date-time */
// //   created?: string | null;
// //   createdBy?: string | null;
// //   /** @format date-time */
// //   lastChanged?: string | null;
// //   lastChangedBy?: string | null;
// //   id?: string | null;
// //   instanceOwner?: InstanceOwner;
// //   appId?: string | null;
// //   org?: string | null;
// //   selfLinks?: ResourceLinks;
// //   /** @format date-time */
// //   dueBefore?: string | null;
// //   /** @format date-time */
// //   visibleAfter?: string | null;
// //   process?: ProcessState;
// //   status?: InstanceStatus;
// //   completeConfirmations?: CompleteConfirmation[] | null;
// //   data?: DataElement[] | null;
// //   presentationTexts?: Record<string, string | null>;
// //   dataValues?: Record<string, string | null>;
// // }
// //
// // export interface InstanceFileScanResult {
// //   id?: string | null;
// //   fileScanResult?: FileScanResult;
// //   data?: DataElementFileScanResult[] | null;
// // }
// //
// // export interface InstanceOwner {
// //   partyId?: string | null;
// //   personNumber?: string | null;
// //   organisationNumber?: string | null;
// //   username?: string | null;
// // }
// //
// // export interface InstanceSelection {
// //   rowsPerPageOptions?: number[] | null;
// //   /** @format int32 */
// //   defaultRowsPerPage?: number | null;
// //   /** @format int32 */
// //   defaultSelectedOption?: number | null;
// //   sortDirection?: string | null;
// // }
// //
// // export interface InstanceStatus {
// //   isArchived?: boolean;
// //   /** @format date-time */
// //   archived?: string | null;
// //   isSoftDeleted?: boolean;
// //   /** @format date-time */
// //   softDeleted?: string | null;
// //   isHardDeleted?: boolean;
// //   /** @format date-time */
// //   hardDeleted?: string | null;
// //   readStatus?: ReadStatus;
// //   substatus?: Substatus;
// // }
// //
// // export interface InstansiationInstance {
// //   instanceOwner?: InstanceOwner;
// //   /** @format date-time */
// //   dueBefore?: string | null;
// //   /** @format date-time */
// //   visibleAfter?: string | null;
// //   prefill?: Record<string, string | null>;
// //   sourceInstanceId?: string | null;
// // }
// //
// // export interface InvoiceDetails {
// //   invoiceNumber?: string | null;
// // }
// //
// // export interface JsonNode {
// //   options?: JsonNodeOptions;
// //   parent?: JsonNode;
// //   root?: JsonNode;
// // }
// //
// // export interface JsonNodeOptions {
// //   propertyNameCaseInsensitive?: boolean;
// // }
// //
// // export interface JsonPatch {
// //   operations?: PatchOperation[] | null;
// // }
// //
// // export interface KeyValueEntry {
// //   key?: string | null;
// //   value?: string | null;
// // }
// //
// // export interface Logo {
// //   displayAppOwnerNameInHeader?: boolean;
// //   source?: string | null;
// //   size?: string | null;
// // }
// //
// // export interface MessageBoxConfig {
// //   hideSettings?: HideSettings;
// // }
// //
// // export interface OnEntry {
// //   show?: string | null;
// //   instanceSelection?: InstanceSelection;
// // }
// //
// // export interface OnEntryConfig {
// //   show?: string | null;
// // }
// //
// // export enum OperationType {
// //   Unknown = "Unknown",
// //   Add = "add",
// //   Remove = "remove",
// //   Replace = "replace",
// //   Move = "move",
// //   Copy = "copy",
// //   Test = "test",
// // }
// //
// // export interface OrderDetails {
// //   paymentProcessorId: string | null;
// //   receiver: PaymentReceiver;
// //   payer?: Payer;
// //   currency: string | null;
// //   orderLines: PaymentOrderLine[] | null;
// //   allowedPayerTypes?: PayerType[] | null;
// //   orderReference?: string | null;
// //   /** @format double */
// //   totalPriceExVat?: number;
// //   /** @format double */
// //   totalVat?: number;
// //   /** @format double */
// //   totalPriceIncVat?: number;
// // }
// //
// // export interface PartyTypesAllowed {
// //   bankruptcyEstate?: boolean;
// //   organisation?: boolean;
// //   person?: boolean;
// //   subUnit?: boolean;
// // }
// //
// // export interface PatchListItem {
// //   /** @format uuid */
// //   dataElementId?: string;
// //   patch?: JsonPatch;
// // }
// //
// // export interface PatchOperation {
// //   op?: OperationType;
// //   from?: string[] | null;
// //   path?: string[] | null;
// //   value?: JsonNode;
// // }
// //
// // export interface Payer {
// //   privatePerson?: PayerPrivatePerson;
// //   company?: PayerCompany;
// //   shippingAddress?: Address;
// //   billingAddress?: Address;
// // }
// //
// // export interface PayerCompany {
// //   organisationNumber?: string | null;
// //   name?: string | null;
// //   contactPerson?: PayerPrivatePerson;
// // }
// //
// // export interface PayerPrivatePerson {
// //   firstName?: string | null;
// //   lastName?: string | null;
// //   email?: string | null;
// //   phoneNumber?: PhoneNumber;
// // }
// //
// // export enum PayerType {
// //   Person = "Person",
// //   Company = "Company",
// // }
// //
// // export interface PaymentDetails {
// //   paymentId: string | null;
// //   redirectUrl?: string | null;
// //   payer?: Payer;
// //   paymentType?: string | null;
// //   paymentMethod?: string | null;
// //   createdDate?: string | null;
// //   chargedDate?: string | null;
// //   invoiceDetails?: InvoiceDetails;
// //   cardDetails?: CardDetails;
// // }
// //
// // export interface PaymentInformation {
// //   taskId: string | null;
// //   status: PaymentStatus;
// //   orderDetails: OrderDetails;
// //   paymentDetails?: PaymentDetails;
// // }
// //
// // export interface PaymentOrderLine {
// //   id: string | null;
// //   name: string | null;
// //   textResourceKey?: string | null;
// //   /** @format double */
// //   priceExVat: number;
// //   /** @format int32 */
// //   quantity?: number;
// //   /** @format double */
// //   vatPercent: number;
// //   unit?: string | null;
// // }
// //
// // export interface PaymentReceiver {
// //   organisationNumber?: string | null;
// //   name?: string | null;
// //   postalAddress?: Address;
// //   bankAccountNumber?: string | null;
// //   email?: string | null;
// //   phoneNumber?: PhoneNumber;
// // }
// //
// // export enum PaymentStatus {
// //   Uninitialized = "Uninitialized",
// //   Created = "Created",
// //   Paid = "Paid",
// //   Failed = "Failed",
// //   Cancelled = "Cancelled",
// //   Skipped = "Skipped",
// // }
// //
// // export interface PhoneNumber {
// //   prefix?: string | null;
// //   number?: string | null;
// // }
// //
// // export interface ProblemDetails {
// //   type?: string | null;
// //   title?: string | null;
// //   /** @format int32 */
// //   status?: number | null;
// //   detail?: string | null;
// //   instance?: string | null;
// //   [key: string]: any;
// // }
// //
// // export interface ProcessElementInfo {
// //   /** @format int32 */
// //   flow?: number | null;
// //   /** @format date-time */
// //   started?: string | null;
// //   elementId?: string | null;
// //   name?: string | null;
// //   altinnTaskType?: string | null;
// //   /** @format date-time */
// //   ended?: string | null;
// //   validated?: ValidationStatus;
// //   flowType?: string | null;
// // }
// //
// // export interface ProcessHistoryItem {
// //   eventType?: string | null;
// //   elementId?: string | null;
// //   /** @format date-time */
// //   occured?: string | null;
// //   /** @format date-time */
// //   started?: string | null;
// //   /** @format date-time */
// //   ended?: string | null;
// //   performedBy?: string | null;
// // }
// //
// // export interface ProcessHistoryList {
// //   processHistory?: ProcessHistoryItem[] | null;
// // }
// //
// // export interface ProcessNext {
// //   action?: string | null;
// // }
// //
// // export interface ProcessState {
// //   /** @format date-time */
// //   started?: string | null;
// //   startEvent?: string | null;
// //   currentTask?: ProcessElementInfo;
// //   /** @format date-time */
// //   ended?: string | null;
// //   endEvent?: string | null;
// // }
// //
// // /** @format int32 */
// // export enum ReadStatus {
// //   Value0 = 0,
// //   Value1 = 1,
// //   Value2 = 2,
// // }
// //
// // export interface Reference {
// //   value?: string | null;
// //   relation?: RelationType;
// //   valueType?: ReferenceType;
// // }
// //
// // export enum ReferenceType {
// //   DataElement = "DataElement",
// //   Task = "Task",
// // }
// //
// // export enum RelationType {
// //   GeneratedFrom = "GeneratedFrom",
// // }
// //
// // export interface ResourceLinks {
// //   apps?: string | null;
// //   platform?: string | null;
// // }
// //
// // export interface ShadowFields {
// //   prefix?: string | null;
// //   saveToDataType?: string | null;
// // }
// //
// // export interface SimpleInstance {
// //   id?: string | null;
// //   presentationTexts?: Record<string, string>;
// //   /** @format date-time */
// //   dueBefore?: string | null;
// //   /** @format date-time */
// //   lastChanged?: string | null;
// //   lastChangedBy?: string | null;
// // }
// //
// // export interface Substatus {
// //   label?: string | null;
// //   description?: string | null;
// // }
// //
// // export interface TagsList {
// //   tags?: string[] | null;
// // }
// //
// // export interface TextResource {
// //   id?: string | null;
// //   org?: string | null;
// //   language?: string | null;
// //   resources?: TextResourceElement[] | null;
// // }
// //
// // export interface TextResourceElement {
// //   id?: string | null;
// //   value?: string | null;
// //   variables?: TextResourceVariable[] | null;
// // }
// //
// // export interface TextResourceVariable {
// //   key?: string | null;
// //   dataSource?: string | null;
// //   defaultValue?: string | null;
// // }
// //
// // export interface UserAction {
// //   id: string | null;
// //   authorized?: boolean;
// //   type?: ActionType;
// // }
// //
// // export interface UserActionRequest {
// //   action?: string | null;
// //   buttonId?: string | null;
// //   metadata?: Record<string, string>;
// //   ignoredValidators?: string[] | null;
// // }
// //
// // export interface UserActionResponse {
// //   instance: Instance;
// //   updatedDataModels?: Record<string, any>;
// //   updatedValidationIssues?: Record<string, Record<string, ValidationIssueWithSource[]>>;
// //   clientActions?: ClientAction[] | null;
// //   error?: ActionError;
// //   /** @format uri */
// //   redirectUrl?: string | null;
// // }
// //
// // export interface UserDefinedMetadataDto {
// //   userDefinedMetadata?: KeyValueEntry[] | null;
// // }
// //
// // /** @format int32 */
// // export enum ValidationIssueSeverity {
// //   Value0 = 0,
// //   Value1 = 1,
// //   Value2 = 2,
// //   Value3 = 3,
// //   Value4 = 4,
// //   Value5 = 5,
// // }
// //
// // export interface ValidationIssueWithSource {
// //   severity: ValidationIssueSeverity;
// //   dataElementId?: string | null;
// //   field?: string | null;
// //   code: string | null;
// //   description: string | null;
// //   source: string | null;
// //   noIncrementalUpdates?: boolean;
// //   customTextKey?: string | null;
// //   customTextParams?: string[] | null;
// // }
// //
// // export interface ValidationSourcePair {
// //   source?: string | null;
// //   issues?: ValidationIssueWithSource[] | null;
// // }
// //
// // export interface ValidationStatus {
// //   /** @format date-time */
// //   timestamp?: string | null;
// //   canCompleteTask?: boolean;
// // }
// //
// // export type QueryParamsType = Record<string | number, any>;
// // export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;
// //
// // export interface FullRequestParams extends Omit<RequestInit, "body"> {
// //   /** set parameter to `true` for call `securityWorker` for this request */
// //   secure?: boolean;
// //   /** request path */
// //   path: string;
// //   /** content type of request body */
// //   type?: ContentType;
// //   /** query params */
// //   query?: QueryParamsType;
// //   /** format of response (i.e. response.json() -> format: "json") */
// //   format?: ResponseFormat;
// //   /** request body */
// //   body?: unknown;
// //   /** base url */
// //   baseUrl?: string;
// //   /** request cancellation token */
// //   cancelToken?: CancelToken;
// // }
// //
// // export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;
// //
// // export interface ApiConfig<SecurityDataType = unknown> {
// //   baseUrl?: string;
// //   baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
// //   securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
// //   customFetch?: typeof fetch;
// // }
// //
// // export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
// //   data: D;
// //   error: E;
// // }
// //
// // type CancelToken = Symbol | string | number;
// //
// // export enum ContentType {
// //   Json = "application/json",
// //   FormData = "multipart/form-data",
// //   UrlEncoded = "application/x-www-form-urlencoded",
// //   Text = "text/plain",
// // }
// //
// // export class HttpClient<SecurityDataType = unknown> {
// //   public baseUrl: string = "";
// //   private securityData: SecurityDataType | null = null;
// //   private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
// //   private abortControllers = new Map<CancelToken, AbortController>();
// //   private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);
// //
// //   private baseApiParams: RequestParams = {
// //     credentials: "same-origin",
// //     headers: {},
// //     redirect: "follow",
// //     referrerPolicy: "no-referrer",
// //   };
// //
// //   constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
// //     Object.assign(this, apiConfig);
// //   }
// //
// //   public setSecurityData = (data: SecurityDataType | null) => {
// //     this.securityData = data;
// //   };
// //
// //   protected encodeQueryParam(key: string, value: any) {
// //     const encodedKey = encodeURIComponent(key);
// //     return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
// //   }
// //
// //   protected addQueryParam(query: QueryParamsType, key: string) {
// //     return this.encodeQueryParam(key, query[key]);
// //   }
// //
// //   protected addArrayQueryParam(query: QueryParamsType, key: string) {
// //     const value = query[key];
// //     return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
// //   }
// //
// //   protected toQueryString(rawQuery?: QueryParamsType): string {
// //     const query = rawQuery || {};
// //     const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
// //     return keys
// //       .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
// //       .join("&");
// //   }
// //
// //   protected addQueryParams(rawQuery?: QueryParamsType): string {
// //     const queryString = this.toQueryString(rawQuery);
// //     return queryString ? `?${queryString}` : "";
// //   }
// //
// //   private contentFormatters: Record<ContentType, (input: any) => any> = {
// //     [ContentType.Json]: (input: any) =>
// //       input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
// //     [ContentType.Text]: (input: any) => (input !== null && typeof input !== "string" ? JSON.stringify(input) : input),
// //     [ContentType.FormData]: (input: any) =>
// //       Object.keys(input || {}).reduce((formData, key) => {
// //         const property = input[key];
// //         formData.append(
// //           key,
// //           property instanceof Blob
// //             ? property
// //             : typeof property === "object" && property !== null
// //               ? JSON.stringify(property)
// //               : `${property}`,
// //         );
// //         return formData;
// //       }, new FormData()),
// //     [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
// //   };
// //
// //   protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
// //     return {
// //       ...this.baseApiParams,
// //       ...params1,
// //       ...(params2 || {}),
// //       headers: {
// //         ...(this.baseApiParams.headers || {}),
// //         ...(params1.headers || {}),
// //         ...((params2 && params2.headers) || {}),
// //       },
// //     };
// //   }
// //
// //   protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
// //     if (this.abortControllers.has(cancelToken)) {
// //       const abortController = this.abortControllers.get(cancelToken);
// //       if (abortController) {
// //         return abortController.signal;
// //       }
// //       return void 0;
// //     }
// //
// //     const abortController = new AbortController();
// //     this.abortControllers.set(cancelToken, abortController);
// //     return abortController.signal;
// //   };
// //
// //   public abortRequest = (cancelToken: CancelToken) => {
// //     const abortController = this.abortControllers.get(cancelToken);
// //
// //     if (abortController) {
// //       abortController.abort();
// //       this.abortControllers.delete(cancelToken);
// //     }
// //   };
// //
// //   public request = async <T = any, E = any>({
// //     body,
// //     secure,
// //     path,
// //     type,
// //     query,
// //     format,
// //     baseUrl,
// //     cancelToken,
// //     ...params
// //   }: FullRequestParams): Promise<HttpResponse<T, E>> => {
// //     const secureParams =
// //       ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
// //         this.securityWorker &&
// //         (await this.securityWorker(this.securityData))) ||
// //       {};
// //     const requestParams = this.mergeRequestParams(params, secureParams);
// //     const queryString = query && this.toQueryString(query);
// //     const payloadFormatter = this.contentFormatters[type || ContentType.Json];
// //     const responseFormat = format || requestParams.format;
// //
// //     return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
// //       ...requestParams,
// //       headers: {
// //         ...(requestParams.headers || {}),
// //         ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
// //       },
// //       signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
// //       body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
// //     }).then(async (response) => {
// //       const r = response.clone() as HttpResponse<T, E>;
// //       r.data = null as unknown as T;
// //       r.error = null as unknown as E;
// //
// //       const data = !responseFormat
// //         ? r
// //         : await response[responseFormat]()
// //             .then((data) => {
// //               if (r.ok) {
// //                 r.data = data;
// //               } else {
// //                 r.error = data;
// //               }
// //               return r;
// //             })
// //             .catch((e) => {
// //               r.error = e;
// //               return r;
// //             });
// //
// //       if (cancelToken) {
// //         this.abortControllers.delete(cancelToken);
// //       }
// //
// //       if (!response.ok) throw data;
// //       return data;
// //     });
// //   };
// // }
// //
// // /**
// //  * @title Altinn App Api
// //  * @version v1
// //  */
// // export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
// //   org = {
// //     /**
// //      * No description
// //      *
// //      * @tags Actions
// //      * @name ActionsCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions
// //      */
// //     actionsCreate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       data: UserActionRequest,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<UserActionResponse, ProblemDetails | void>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/actions`,
// //         method: "POST",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ApplicationLanguage
// //      * @name V1ApplicationlanguagesDetail
// //      * @request GET:/{org}/{app}/api/v1/applicationlanguages
// //      */
// //     v1ApplicationlanguagesDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<ApplicationLanguage[], void>({
// //         path: `/${org}/${app}/api/v1/applicationlanguages`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ApplicationMetadata
// //      * @name V1ApplicationmetadataDetail
// //      * @request GET:/{org}/{app}/api/v1/applicationmetadata
// //      */
// //     v1ApplicationmetadataDetail: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         /** @default true */
// //         checkOrgApp?: boolean;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<ApplicationMetadata, any>({
// //         path: `/${org}/${app}/api/v1/applicationmetadata`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ApplicationMetadata
// //      * @name V1MetaAuthorizationpolicyDetail
// //      * @request GET:/{org}/{app}/api/v1/meta/authorizationpolicy
// //      */
// //     v1MetaAuthorizationpolicyDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<string, any>({
// //         path: `/${org}/${app}/api/v1/meta/authorizationpolicy`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ApplicationMetadata
// //      * @name V1MetaProcessDetail
// //      * @request GET:/{org}/{app}/api/v1/meta/process
// //      */
// //     v1MetaProcessDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<string, any>({
// //         path: `/${org}/${app}/api/v1/meta/process`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ApplicationSettings
// //      * @name V1ApplicationsettingsDetail
// //      * @request GET:/{org}/{app}/api/v1/applicationsettings
// //      */
// //     v1ApplicationsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/applicationsettings`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Authentication
// //      * @name AuthenticationKeepAliveDetail
// //      * @request GET:/{org}/{app}/api/Authentication/keepAlive
// //      */
// //     authenticationKeepAliveDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/Authentication/keepAlive`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Authentication
// //      * @name AuthenticationInvalidatecookieUpdate
// //      * @request PUT:/{org}/{app}/api/Authentication/invalidatecookie
// //      */
// //     authenticationInvalidatecookieUpdate: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/Authentication/invalidatecookie`,
// //         method: "PUT",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Authorization
// //      * @name AuthorizationPartiesCurrentDetail
// //      * @request GET:/{org}/{app}/api/authorization/parties/current
// //      */
// //     authorizationPartiesCurrentDetail: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         /** @default false */
// //         returnPartyObject?: boolean;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/authorization/parties/current`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
// //      * @deprecated
// //      */
// //     dataCreate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         dataType?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataElement, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataPartialUpdate
// //      * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
// //      */
// //     dataPartialUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       data: DataPatchRequestMultiple,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataPatchResponseMultiple, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
// //         method: "PATCH",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataCreate2
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataType}
// //      * @originalName dataCreate
// //      * @duplicate
// //      */
// //     dataCreate2: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataType: string,
// //       query?: {
// //         ignoredValidators?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataPostResponse, DataPostErrorResponse | ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataType}`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
// //      */
// //     dataDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       query?: {
// //         /** @default false */
// //         includeRowId?: boolean;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataUpdate
// //      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
// //      */
// //     dataUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<CalculationResult, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
// //         method: "PUT",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataPartialUpdate2
// //      * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
// //      * @deprecated
// //      * @originalName dataPartialUpdate
// //      * @duplicate
// //      */
// //     dataPartialUpdate2: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       data: DataPatchRequest,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataPatchResponse, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
// //         method: "PATCH",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Data
// //      * @name DataDelete
// //      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
// //      */
// //     dataDelete: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       query?: {
// //         ignoredValidators?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataPostResponse, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}`,
// //         method: "DELETE",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags DataLists
// //      * @name DatalistsDetail
// //      * @request GET:/{org}/{app}/api/datalists/{id}
// //      */
// //     datalistsDetail: (
// //       id: string,
// //       org: string,
// //       app: string,
// //       query?: {
// //         queryParams?: Record<string, string>;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/datalists/${id}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags DataLists
// //      * @name DatalistsDetail2
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/datalists/{id}
// //      * @originalName datalistsDetail
// //      * @duplicate
// //      */
// //     datalistsDetail2: (
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       id: string,
// //       org: string,
// //       app: string,
// //       query?: {
// //         queryParams?: Record<string, string>;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/datalists/${id}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags DataTags
// //      * @name DataTagsDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
// //      */
// //     dataTagsDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<TagsList, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags DataTags
// //      * @name DataTagsCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
// //      */
// //     dataTagsCreate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       data: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<TagsList, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags`,
// //         method: "POST",
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags DataTags
// //      * @name DataTagsDelete
// //      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags/{tag}
// //      */
// //     dataTagsDelete: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       tag: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/tags/${tag}`,
// //         method: "DELETE",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags EventsReceiver
// //      * @name V1EventsreceiverCreate
// //      * @request POST:/{org}/{app}/api/v1/eventsreceiver
// //      */
// //     v1EventsreceiverCreate: (
// //       org: string,
// //       app: string,
// //       data: CloudEvent,
// //       query?: {
// //         code?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, void>({
// //         path: `/${org}/${app}/api/v1/eventsreceiver`,
// //         method: "POST",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags ExternalApi
// //      * @name ApiExternalDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/api/external/{externalApiId}
// //      */
// //     apiExternalDetail: (
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       externalApiId: string,
// //       org: string,
// //       app: string,
// //       query?: {
// //         queryParams?: Record<string, string>;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/api/external/${externalApiId}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags FileScan
// //      * @name FilescanresultDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/filescanresult
// //      */
// //     filescanresultDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<InstanceFileScanResult, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/filescanresult`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Home
// //      * @name GetOrg
// //      * @request GET:/{org}/{app}
// //      */
// //     getOrg: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         dontChooseReportee?: boolean;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name InstancesDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
// //      */
// //     instancesDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<Instance, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name InstancesDelete
// //      * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
// //      */
// //     instancesDelete: (
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       org: string,
// //       app: string,
// //       query?: {
// //         hard?: boolean;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<Instance, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}`,
// //         method: "DELETE",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name InstancesCreate
// //      * @request POST:/{org}/{app}/instances
// //      */
// //     instancesCreate: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         /** @format int32 */
// //         instanceOwnerPartyId?: number;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<Instance, ProblemDetails>({
// //         path: `/${org}/${app}/instances`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name CreateCreate
// //      * @request POST:/{org}/{app}/instances/create
// //      */
// //     createCreate: (org: string, app: string, data: InstansiationInstance, params: RequestParams = {}) =>
// //       this.request<Instance, ProblemDetails>({
// //         path: `/${org}/${app}/instances/create`,
// //         method: "POST",
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name CompleteCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete
// //      */
// //     completeCreate: (
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       org: string,
// //       app: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<Instance, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/complete`,
// //         method: "POST",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name SubstatusUpdate
// //      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus
// //      */
// //     substatusUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       data: Substatus,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<Instance, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/substatus`,
// //         method: "PUT",
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Instances
// //      * @name ActiveDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/active
// //      */
// //     activeDetail: (org: string, app: string, instanceOwnerPartyId: number, params: RequestParams = {}) =>
// //       this.request<SimpleInstance[], any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/active`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Options
// //      * @name OptionsDetail
// //      * @request GET:/{org}/{app}/api/options/{optionsId}
// //      */
// //     optionsDetail: (
// //       optionsId: string,
// //       org: string,
// //       app: string,
// //       query?: {
// //         queryParams?: Record<string, string>;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/options/${optionsId}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Options
// //      * @name OptionsDetail2
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/{optionsId}
// //      * @originalName optionsDetail
// //      * @duplicate
// //      */
// //     optionsDetail2: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       optionsId: string,
// //       query?: {
// //         language?: string;
// //         queryParams?: Record<string, string>;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/options/${optionsId}`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Pages
// //      * @name PagesOrderCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/pages/order
// //      * @deprecated
// //      */
// //     pagesOrderCreate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       data: any,
// //       query?: {
// //         layoutSetId?: string;
// //         currentPage?: string;
// //         dataTypeId?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<string[], any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/pages/order`,
// //         method: "POST",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Parties
// //      * @name V1PartiesDetail
// //      * @request GET:/{org}/{app}/api/v1/parties
// //      */
// //     v1PartiesDetail: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         /** @default false */
// //         allowedToInstantiateFilter?: boolean;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/parties`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Parties
// //      * @name V1PartiesValidateInstantiationCreate
// //      * @request POST:/{org}/{app}/api/v1/parties/validateInstantiation
// //      */
// //     v1PartiesValidateInstantiationCreate: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         /** @format int32 */
// //         partyId?: number;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/parties/validateInstantiation`,
// //         method: "POST",
// //         query: query,
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Parties
// //      * @name V1PartiesUpdate
// //      * @request PUT:/{org}/{app}/api/v1/parties/{partyId}
// //      */
// //     v1PartiesUpdate: (partyId: number, org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/parties/${partyId}`,
// //         method: "PUT",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Payment
// //      * @name PaymentDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment
// //      */
// //     paymentDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<PaymentInformation, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Payment
// //      * @name PaymentOrderDetailsDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment/order-details
// //      */
// //     paymentOrderDetailsDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<OrderDetails, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/payment/order-details`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Pdf
// //      * @name DataPdfFormatDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/pdf/format
// //      */
// //     dataPdfFormatDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/pdf/format`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process
// //      */
// //     processDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<AppProcessState, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessStartCreate
// //      * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/start
// //      */
// //     processStartCreate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         startEvent?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<AppProcessState, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/start`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessNextDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
// //      * @deprecated
// //      */
// //     processNextDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<string[], ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessNextUpdate
// //      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
// //      */
// //     processNextUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       data: ProcessNext,
// //       query?: {
// //         elementId?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<AppProcessState, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next`,
// //         method: "PUT",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessCompleteProcessUpdate
// //      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/completeProcess
// //      */
// //     processCompleteProcessUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<AppProcessState, ProblemDetails>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/completeProcess`,
// //         method: "PUT",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Process
// //      * @name ProcessHistoryDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/history
// //      */
// //     processHistoryDetail: (
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       org: string,
// //       app: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<ProcessHistoryList, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/process/history`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Profile
// //      * @name V1ProfileUserDetail
// //      * @request GET:/{org}/{app}/api/v1/profile/user
// //      */
// //     v1ProfileUserDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/profile/user`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Redirect
// //      * @name V1RedirectDetail
// //      * @request GET:/{org}/{app}/api/v1/redirect
// //      */
// //     v1RedirectDetail: (
// //       org: string,
// //       app: string,
// //       query: {
// //         url: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<string, ProblemDetails>({
// //         path: `/${org}/${app}/api/v1/redirect`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name JsonschemaDetail
// //      * @request GET:/{org}/{app}/api/jsonschema/{id}
// //      */
// //     jsonschemaDetail: (id: string, org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/jsonschema/${id}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name LayoutsDetail
// //      * @request GET:/{org}/{app}/api/layouts
// //      */
// //     layoutsDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/layouts`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name LayoutsDetail2
// //      * @request GET:/{org}/{app}/api/layouts/{id}
// //      * @originalName layoutsDetail
// //      * @duplicate
// //      */
// //     layoutsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/layouts/${id}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name LayoutsettingsDetail
// //      * @request GET:/{org}/{app}/api/layoutsettings
// //      */
// //     layoutsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/layoutsettings`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name LayoutsettingsDetail2
// //      * @request GET:/{org}/{app}/api/layoutsettings/{id}
// //      * @originalName layoutsettingsDetail
// //      * @duplicate
// //      */
// //     layoutsettingsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/layoutsettings/${id}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name LayoutsetsDetail
// //      * @request GET:/{org}/{app}/api/layoutsets
// //      */
// //     layoutsetsDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/layoutsets`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name RulehandlerDetail
// //      * @request GET:/{org}/{app}/api/rulehandler/{id}
// //      */
// //     rulehandlerDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/rulehandler/${id}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name RuleconfigurationDetail
// //      * @request GET:/{org}/{app}/api/ruleconfiguration/{id}
// //      */
// //     ruleconfigurationDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/ruleconfiguration/${id}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name V1FooterDetail
// //      * @request GET:/{org}/{app}/api/v1/footer
// //      */
// //     v1FooterDetail: (org: string, app: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/v1/footer`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Resource
// //      * @name ValidationconfigDetail
// //      * @request GET:/{org}/{app}/api/validationconfig/{dataTypeId}
// //      */
// //     validationconfigDetail: (org: string, app: string, dataTypeId: string, params: RequestParams = {}) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/api/validationconfig/${dataTypeId}`,
// //         method: "GET",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags StatelessData
// //      * @name DataDetail2
// //      * @request GET:/{org}/{app}/v1/data
// //      * @originalName dataDetail
// //      * @duplicate
// //      */
// //     dataDetail2: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         dataType?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataElement, any>({
// //         path: `/${org}/${app}/v1/data`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags StatelessData
// //      * @name DataCreate3
// //      * @request POST:/{org}/{app}/v1/data
// //      * @originalName dataCreate
// //      * @duplicate
// //      */
// //     dataCreate3: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         dataType?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataElement, any>({
// //         path: `/${org}/${app}/v1/data`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags StatelessData
// //      * @name DataAnonymousDetail
// //      * @request GET:/{org}/{app}/v1/data/anonymous
// //      */
// //     dataAnonymousDetail: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         dataType?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataElement, any>({
// //         path: `/${org}/${app}/v1/data/anonymous`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags StatelessData
// //      * @name DataAnonymousCreate
// //      * @request POST:/{org}/{app}/v1/data/anonymous
// //      */
// //     dataAnonymousCreate: (
// //       org: string,
// //       app: string,
// //       query?: {
// //         dataType?: string;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<DataElement, any>({
// //         path: `/${org}/${app}/v1/data/anonymous`,
// //         method: "POST",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags StatelessPages
// //      * @name PagesOrderCreate2
// //      * @request POST:/{org}/{app}/v1/pages/order
// //      * @deprecated
// //      * @originalName pagesOrderCreate
// //      * @duplicate
// //      */
// //     pagesOrderCreate2: (
// //       org: string,
// //       app: string,
// //       data: any,
// //       query?: {
// //         layoutSetId?: string;
// //         currentPage?: string;
// //         dataTypeId?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<string[], any>({
// //         path: `/${org}/${app}/v1/pages/order`,
// //         method: "POST",
// //         query: query,
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Texts
// //      * @name V1TextsDetail
// //      * @request GET:/{org}/{app}/api/v1/texts/{language}
// //      */
// //     v1TextsDetail: (org: string, app: string, language: string, params: RequestParams = {}) =>
// //       this.request<TextResource, any>({
// //         path: `/${org}/${app}/api/v1/texts/${language}`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags UserDefinedMetadata
// //      * @name DataUserDefinedMetadataDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
// //      */
// //     dataUserDefinedMetadataDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<UserDefinedMetadataDto, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
// //         method: "GET",
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags UserDefinedMetadata
// //      * @name DataUserDefinedMetadataUpdate
// //      * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
// //      */
// //     dataUserDefinedMetadataUpdate: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       dataGuid: string,
// //       data: UserDefinedMetadataDto,
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<UserDefinedMetadataDto, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/user-defined-metadata`,
// //         method: "PUT",
// //         body: data,
// //         type: ContentType.Json,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Validate
// //      * @name ValidateDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate
// //      */
// //     validateDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerPartyId: number,
// //       instanceGuid: string,
// //       query?: {
// //         ignoredValidators?: string;
// //         onlyIncrementalValidators?: boolean;
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<ValidationIssueWithSource, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/validate`,
// //         method: "GET",
// //         query: query,
// //         format: "json",
// //         ...params,
// //       }),
// //
// //     /**
// //      * No description
// //      *
// //      * @tags Validate
// //      * @name DataValidateDetail
// //      * @request GET:/{org}/{app}/instances/{instanceOwnerId}/{instanceId}/data/{dataGuid}/validate
// //      * @deprecated
// //      */
// //     dataValidateDetail: (
// //       org: string,
// //       app: string,
// //       instanceOwnerId: number,
// //       instanceId: string,
// //       dataGuid: string,
// //       query?: {
// //         language?: string;
// //       },
// //       params: RequestParams = {},
// //     ) =>
// //       this.request<void, any>({
// //         path: `/${org}/${app}/instances/${instanceOwnerId}/${instanceId}/data/${dataGuid}/validate`,
// //         method: "GET",
// //         query: query,
// //         ...params,
// //       }),
// //   };
// // }
