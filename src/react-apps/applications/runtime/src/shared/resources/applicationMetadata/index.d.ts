export interface IApplicationMetadata {
  id: string;
  versionId: string;
  org: string;
  createdDateTime: string;
  createdBy: string;
  lastChangedDateTime: string;
  lastChangedBy: string;
  title: string;
  validFrom: string;
  validTo: string;
  WorkflowId: string;
  maxSize: string;
  elementTypes: string;
  partyTypesAllowed: IPartyTypesAllowed;
  subscriptionHook: ISubscriptionHook;
}

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organization: boolean;
  person: boolean;
  subUnit: boolean;
}

interface ISubscriptionHook {
  serviceCode: string;
  editionCode: number;
}
