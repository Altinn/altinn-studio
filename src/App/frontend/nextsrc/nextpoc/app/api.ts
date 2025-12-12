/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ActionError {
  code?: string | null;
  message?: string | null;
  metadata?: Record<string, string>;
}

/** @format int32 */
export enum ActionType {
  Value0 = 0,
  Value1 = 1,
}

export interface Address {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface AllLayoutSettingsDTO {
  layouts?: string | null;
  schema?: string | null;
  settings?: string | null;
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
  presentationFields?: DataField[] | null;
  dataFields?: DataField[] | null;
  eFormidling?: EFormidlingContract;
  onEntry?: OnEntry;
  messageBoxConfig?: MessageBoxConfig;
  copyInstanceSettings?: CopyInstanceSettings;
  /** @format int32 */
  storageAccountNumber?: number | null;
  disallowUserInstantiation?: boolean;
  id?: string | null;
  features?: Record<string, boolean>;
  logo?: Logo;
  altinnNugetVersion?: string | null;
  externalApiIds?: string[] | null;
  [key: string]: any;
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

export interface ContentTypeCustom {
  boundary?: string | null;
  charSet?: string | null;
  mediaType?: string | null;
  name?: string | null;
  parameters?: any[] | null;
}

export interface CopyInstanceSettings {
  enabled?: boolean;
  excludedDataTypes?: string[] | null;
  excludedDataFields?: string[] | null;
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

export interface DataElementFileScanResult {
  id?: string | null;
  fileScanResult?: FileScanResult;
}

export interface DataField {
  id?: string | null;
  path?: string | null;
  dataTypeId?: string | null;
}

export interface DataModelPairResponse {
  /** @format uuid */
  dataElementId?: string;
  data?: any;
}

export interface DataPatchRequest {
  patch: JsonPatch;
  ignoredValidators: string[] | null;
}

export interface DataPatchRequestMultiple {
  patches: PatchListItem[] | null;
  ignoredValidators: string[] | null;
}

export interface DataPatchResponse {
  validationIssues: Record<string, ValidationIssueWithSource[]>;
  newDataModel: any;
  instance: Instance;
}

export interface DataPatchResponseMultiple {
  validationIssues: ValidationSourcePair[] | null;
  newDataModels: DataModelPairResponse[] | null;
  instance: Instance;
}

export interface DataPostErrorResponse {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  uploadValidationIssues?: ValidationIssueWithSource[] | null;
  [key: string]: any;
}

export interface DataPostResponse {
  /** @format uuid */
  newDataElementId: string;
  instance: Instance;
  validationIssues: ValidationSourcePair[] | null;
  newDataModels: DataModelPairResponse[] | null;
}

export interface DataType {
  id?: string | null;
  description?: Record<string, string>;
  allowedContentTypes?: string[] | null;
  allowedContributers?: string[] | null;
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

export enum FileScanResult {
  NotApplicable = "NotApplicable",
  Pending = "Pending",
  Clean = "Clean",
  Infected = "Infected",
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

export interface InstanceFileScanResult {
  id?: string | null;
  fileScanResult?: FileScanResult;
  data?: DataElementFileScanResult[] | null;
}

export interface InstanceOwner {
  partyId?: string | null;
  personNumber?: string | null;
  organisationNumber?: string | null;
  username?: string | null;
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

export interface InstansiationInstance {
  instanceOwner?: InstanceOwner;
  /** @format date-time */
  dueBefore?: string | null;
  /** @format date-time */
  visibleAfter?: string | null;
  prefill?: Record<string, string | null>;
  sourceInstanceId?: string | null;
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

export interface MessageBoxConfig {
  hideSettings?: HideSettings;
}

export interface OnEntry {
  show?: string | null;
  instanceSelection?: InstanceSelection;
}

export interface OnEntryConfig {
  show?: string | null;
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

export interface PartyTypesAllowed {
  bankruptcyEstate?: boolean;
  organisation?: boolean;
  person?: boolean;
  subUnit?: boolean;
}

export interface PatchListItem {
  /** @format uuid */
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

export enum PayerType {
  Person = "Person",
  Company = "Company",
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

export enum PaymentStatus {
  Uninitialized = "Uninitialized",
  Created = "Created",
  Paid = "Paid",
  Failed = "Failed",
  Cancelled = "Cancelled",
  Skipped = "Skipped",
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

export interface ProcessNext {
  action?: string | null;
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

/** @format int32 */
export enum ReadStatus {
  Value0 = 0,
  Value1 = 1,
  Value2 = 2,
}

export interface Reference {
  value?: string | null;
  relation?: RelationType;
  valueType?: ReferenceType;
}

export enum ReferenceType {
  DataElement = "DataElement",
  Task = "Task",
}

export enum RelationType {
  GeneratedFrom = "GeneratedFrom",
}

export interface ResourceLinks {
  apps?: string | null;
  platform?: string | null;
}

export interface ShadowFields {
  prefix?: string | null;
  saveToDataType?: string | null;
}

export interface SimpleInstance {
  id?: string | null;
  presentationTexts?: Record<string, string>;
  /** @format date-time */
  dueBefore?: string | null;
  /** @format date-time */
  lastChanged?: string | null;
  lastChangedBy?: string | null;
}

export interface Substatus {
  label?: string | null;
  description?: string | null;
}

export interface TagsList {
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

export interface UserActionRequest {
  action?: string | null;
  buttonId?: string | null;
  metadata?: Record<string, string>;
  ignoredValidators?: string[] | null;
}

export interface UserActionResponse {
  instance: Instance;
  updatedDataModels?: Record<string, any>;
  updatedValidationIssues?: Record<string, Record<string, ValidationIssueWithSource[]>>;
  clientActions?: ClientAction[] | null;
  error?: ActionError;
  /** @format uri */
  redirectUrl?: string | null;
}

export interface UserDefinedMetadataDto {
  userDefinedMetadata?: KeyValueEntry[] | null;
}

/** @format int32 */
export enum ValidationIssueSeverity {
  Value0 = 0,
  Value1 = 1,
  Value2 = 2,
  Value3 = 3,
  Value4 = 4,
  Value5 = 5,
}

export interface ValidationIssueWithSource {
  severity: ValidationIssueSeverity;
  dataElementId?: string | null;
  field?: string | null;
  code: string | null;
  description: string | null;
  source: string | null;
  noIncrementalUpdates?: boolean;
  customTextKey?: string | null;
  customTextParams?: string[] | null;
}

export interface ValidationSourcePair {
  source?: string | null;
  issues?: ValidationIssueWithSource[] | null;
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

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

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
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== "string" ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
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
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
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

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
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

    return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
      },
      signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
      body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
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
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  org = {
    /**
     * No description
     *
     * @tags Actions
     * @name ActionsCreate
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions
     */
    actionsCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: UserActionRequest,
      query?: {
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserActionResponse, ProblemDetails | void>({
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
     * @name V1ApplicationlanguagesDetail
     * @request GET:/{org}/{app}/api/v1/applicationlanguages
     */
    v1ApplicationlanguagesDetail: (org: string, app: string, params: RequestParams = {}) =>
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
     * @name V1ApplicationmetadataDetail
     * @request GET:/{org}/{app}/api/v1/applicationmetadata
     */
    v1ApplicationmetadataDetail: (
      org: string,
      app: string,
      query?: {
        /** @default true */
        checkOrgApp?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<ApplicationMetadata, any>({
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
     * @name V1MetaAuthorizationpolicyDetail
     * @request GET:/{org}/{app}/api/v1/meta/authorizationpolicy
     */
    v1MetaAuthorizationpolicyDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/v1/meta/authorizationpolicy`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationMetadata
     * @name V1MetaProcessDetail
     * @request GET:/{org}/{app}/api/v1/meta/process
     */
    v1MetaProcessDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/${org}/${app}/api/v1/meta/process`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationSettings
     * @name V1ApplicationsettingsDetail
     * @request GET:/{org}/{app}/api/v1/applicationsettings
     */
    v1ApplicationsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/applicationsettings`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authentication
     * @name AuthenticationKeepAliveDetail
     * @request GET:/{org}/{app}/api/Authentication/keepAlive
     */
    authenticationKeepAliveDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/Authentication/keepAlive`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authentication
     * @name AuthenticationInvalidatecookieUpdate
     * @request PUT:/{org}/{app}/api/Authentication/invalidatecookie
     */
    authenticationInvalidatecookieUpdate: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/Authentication/invalidatecookie`,
        method: "PUT",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Authorization
     * @name AuthorizationPartiesCurrentDetail
     * @request GET:/{org}/{app}/api/authorization/parties/current
     */
    authorizationPartiesCurrentDetail: (
      org: string,
      app: string,
      query?: {
        /** @default false */
        returnPartyObject?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/authorization/parties/current`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Data
     * @name DataCreate
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
     * @deprecated
     */
    dataCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
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
     * @request PATCH:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data
     */
    dataPartialUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: DataPatchRequestMultiple,
      query?: {
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
     * @name DataCreate2
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataType}
     * @originalName dataCreate
     * @duplicate
     */
    dataCreate2: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataType: string,
      query?: {
        ignoredValidators?: string;
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataPostResponse, DataPostErrorResponse | ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataType}`,
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
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      query?: {
        /** @default false */
        includeRowId?: boolean;
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
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      query?: {
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
     * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}
     */
    dataDelete: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      query?: {
        ignoredValidators?: string;
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
     * @request GET:/{org}/{app}/api/datalists/{id}
     */
    datalistsDetail: (
      id: string,
      org: string,
      app: string,
      query?: {
        queryParams?: Record<string, string>;
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
        queryParams?: Record<string, string>;
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
     * @name DataTagsDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags
     */
    dataTagsDetail: (
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
     * @name DataTagsDelete
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
      this.request<void, void>({
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
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/api/external/{externalApiId}
     */
    apiExternalDetail: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      externalApiId: string,
      org: string,
      app: string,
      query?: {
        queryParams?: Record<string, string>;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, ProblemDetails>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/api/external/${externalApiId}`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags FileScan
     * @name FilescanresultDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/filescanresult
     */
    filescanresultDetail: (
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
     * @request GET:/{org}/{app}
     */
    getOrg: (
      org: string,
      app: string,
      query?: {
        dontChooseReportee?: boolean;
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
     * @tags Instances
     * @name InstancesDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
     */
    instancesDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<Instance, ProblemDetails>({
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
     * @request DELETE:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}
     */
    instancesDelete: (
      instanceOwnerPartyId: number,
      instanceGuid: string,
      org: string,
      app: string,
      query?: {
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
     * @request POST:/{org}/{app}/instances
     */
    instancesCreate: (
      org: string,
      app: string,
      query?: {
        /** @format int32 */
        instanceOwnerPartyId?: number;
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Instance, ProblemDetails>({
        path: `/${org}/${app}/instances`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    // instancesCreate: (
    //   org: string,
    //   app: string,
    //   query?: {
    //     /** @format int32 */
    //     instanceOwnerPartyId?: number;
    //     language?: string;
    //   },
    //   params: RequestParams = {},
    // ) =>
    //   this.request<Instance, ProblemDetails>({
    //     path: `/${org}/${app}/instances`,
    //     method: "POST",
    //     query: query,
    //     headers: {
    //       // from the second request
    //       Accept: 'application/json, text/plain, */*',
    //       'Accept-Language': 'en,nb;q=0.9,no;q=0.8,sv;q=0.7',
    //       Referer: 'http://local.altinn.cloud/krt/krt-3010a-1/',
    //       // you can add Content-Length: '0' if your request library doesn't set it automatically
    //       // "Content-Length": "0"
    //     },
    //     format: "json",
    //     ...params,
    //   }),

    /**
     * No description
     *
     * @tags Instances
     * @name CreateCreate
     * @request POST:/{org}/{app}/instances/create
     */
    createCreate: (org: string, app: string, data: InstansiationInstance, params: RequestParams = {}) =>
      this.request<Instance, ProblemDetails>({
        path: `/${org}/${app}/instances/create`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Instances
     * @name CompleteCreate
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
     * @name ActiveDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/active
     */
    activeDetail: (org: string, app: string, instanceOwnerPartyId: number, params: RequestParams = {}) =>
      this.request<SimpleInstance[], any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/active`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Options
     * @name OptionsDetail
     * @request GET:/{org}/{app}/api/options/{optionsId}
     */
    optionsDetail: (
      optionsId: string,
      org: string,
      app: string,
      query?: {
        queryParams?: Record<string, string>;
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
        language?: string;
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
      this.request<string[], any>({
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
     * @name V1PartiesDetail
     * @request GET:/{org}/{app}/api/v1/parties
     */
    v1PartiesDetail: (
      org: string,
      app: string,
      query?: {
        /** @default false */
        allowedToInstantiateFilter?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/parties`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Parties
     * @name V1PartiesValidateInstantiationCreate
     * @request POST:/{org}/{app}/api/v1/parties/validateInstantiation
     */
    v1PartiesValidateInstantiationCreate: (
      org: string,
      app: string,
      query?: {
        /** @format int32 */
        partyId?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/parties/validateInstantiation`,
        method: "POST",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Parties
     * @name V1PartiesUpdate
     * @request PUT:/{org}/{app}/api/v1/parties/{partyId}
     */
    v1PartiesUpdate: (partyId: number, org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/parties/${partyId}`,
        method: "PUT",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Payment
     * @name PaymentDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment
     */
    paymentDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
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
     * @name PaymentOrderDetailsDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment/order-details
     */
    paymentOrderDetailsDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
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
     * @name DataPdfFormatDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/pdf/format
     */
    dataPdfFormatDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      dataGuid: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataGuid}/pdf/format`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Process
     * @name ProcessDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process
     */
    processDetail: (
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
     * @request POST:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/start
     */
    processStartCreate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
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
     * @name ProcessNextDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
     * @deprecated
     */
    processNextDetail: (
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
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next
     */
    processNextUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      data: ProcessNext,
      query?: {
        elementId?: string;
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
     * @request PUT:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/completeProcess
     */
    processCompleteProcessUpdate: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
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
     * @name ProcessHistoryDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/history
     */
    processHistoryDetail: (
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
     * @name V1ProfileUserDetail
     * @request GET:/{org}/{app}/api/v1/profile/user
     */
    v1ProfileUserDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/profile/user`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Redirect
     * @name V1RedirectDetail
     * @request GET:/{org}/{app}/api/v1/redirect
     */
    v1RedirectDetail: (
      org: string,
      app: string,
      query: {
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
     * @name LayoutsAllSettingsDetail
     * @request GET:/{org}/{app}/api/layouts/all-settings/{id}
     */
    layoutsAllSettingsDetail: (id: string, org: string, app: string, params: RequestParams = {}) =>
      this.request<AllLayoutSettingsDTO, any>({
        path: `/${org}/${app}/api/layouts/all-settings/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name JsonschemaDetail
     * @request GET:/{org}/{app}/api/jsonschema/{id}
     */
    jsonschemaDetail: (id: string, org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/jsonschema/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsDetail
     * @request GET:/{org}/{app}/api/layouts
     */
    layoutsDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/layouts`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsDetail2
     * @request GET:/{org}/{app}/api/layouts/{id}
     * @originalName layoutsDetail
     * @duplicate
     */
    layoutsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/layouts/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsettingsDetail
     * @request GET:/{org}/{app}/api/layoutsettings
     */
    layoutsettingsDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/layoutsettings`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsettingsDetail2
     * @request GET:/{org}/{app}/api/layoutsettings/{id}
     * @originalName layoutsettingsDetail
     * @duplicate
     */
    layoutsettingsDetail2: (org: string, app: string, id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/layoutsettings/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name LayoutsetsDetail
     * @request GET:/{org}/{app}/api/layoutsets
     */
    layoutsetsDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/layoutsets`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name RulehandlerDetail
     * @request GET:/{org}/{app}/api/rulehandler/{id}
     */
    rulehandlerDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/rulehandler/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name RuleconfigurationDetail
     * @request GET:/{org}/{app}/api/ruleconfiguration/{id}
     */
    ruleconfigurationDetail: (org: string, app: string, id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/ruleconfiguration/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name V1FooterDetail
     * @request GET:/{org}/{app}/api/v1/footer
     */
    v1FooterDetail: (org: string, app: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/v1/footer`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Resource
     * @name ValidationconfigDetail
     * @request GET:/{org}/{app}/api/validationconfig/{dataTypeId}
     */
    validationconfigDetail: (org: string, app: string, dataTypeId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/${org}/${app}/api/validationconfig/${dataTypeId}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StatelessData
     * @name DataDetail2
     * @request GET:/{org}/{app}/v1/data
     * @originalName dataDetail
     * @duplicate
     */
    dataDetail2: (
      org: string,
      app: string,
      query?: {
        dataType?: string;
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DataElement, any>({
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
     * @name DataCreate3
     * @request POST:/{org}/{app}/v1/data
     * @originalName dataCreate
     * @duplicate
     */
    dataCreate3: (
      org: string,
      app: string,
      query?: {
        dataType?: string;
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
     * @name DataAnonymousDetail
     * @request GET:/{org}/{app}/v1/data/anonymous
     */
    dataAnonymousDetail: (
      org: string,
      app: string,
      query?: {
        dataType?: string;
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
     * @request POST:/{org}/{app}/v1/data/anonymous
     */
    dataAnonymousCreate: (
      org: string,
      app: string,
      query?: {
        dataType?: string;
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
      this.request<string[], any>({
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
     * @request GET:/{org}/{app}/api/v1/texts/{language}
     */
    v1TextsDetail: (org: string, app: string, language: string, params: RequestParams = {}) =>
      this.request<TextResource, any>({
        path: `/${org}/${app}/api/v1/texts/${language}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags UserDefinedMetadata
     * @name DataUserDefinedMetadataDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata
     */
    dataUserDefinedMetadataDetail: (
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
     * @name ValidateDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate
     */
    validateDetail: (
      org: string,
      app: string,
      instanceOwnerPartyId: number,
      instanceGuid: string,
      query?: {
        ignoredValidators?: string;
        onlyIncrementalValidators?: boolean;
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ValidationIssueWithSource, any>({
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
     * @name DataValidateDetail
     * @request GET:/{org}/{app}/instances/{instanceOwnerId}/{instanceId}/data/{dataGuid}/validate
     * @deprecated
     */
    dataValidateDetail: (
      org: string,
      app: string,
      instanceOwnerId: number,
      instanceId: string,
      dataGuid: string,
      query?: {
        language?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/${org}/${app}/instances/${instanceOwnerId}/${instanceId}/data/${dataGuid}/validate`,
        method: "GET",
        query: query,
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
//   contenttype?: ContentType1;
// }
//
// export interface CompleteConfirmation {
//   stakeholderId?: string | null;
//   /** @format date-time */
//   confirmedOn?: string;
// }
//
// export interface ContentType1 {
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
//     body,
//     secure,
//     path,
//     type,
//     query,
//     format,
//     baseUrl,
//     cancelToken,
//     ...params
//   }: FullRequestParams): Promise<HttpResponse<T, E>> => {
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
//             .then((data) => {
//               if (r.ok) {
//                 r.data = data;
//               } else {
//                 r.error = data;
//               }
//               return r;
//             })
//             .catch((e) => {
//               r.error = e;
//               return r;
//             });
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
