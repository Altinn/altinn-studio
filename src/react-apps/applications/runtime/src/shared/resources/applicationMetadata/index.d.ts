import { ITitle, IDataType } from "../../../../../shared/src/types";

export interface IApplicationMetadata {
  createdBy: string;
  createdDateTime: string;
  dataTypes: IDataType[];
  id: string;
  lastChangedBy: string;
  lastChangedDateTime: string;
  maxSize: string;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  subscriptionHook: ISubscriptionHook;
  title: ITitle;
  validFrom: string;
  validTo: string;
  versionId: string;
  WorkflowId: string;
}

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

interface ISubscriptionHook {
  serviceCode: string;
  editionCode: number;
}
