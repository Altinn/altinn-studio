type ValidationStatus = {
  timestamp?: string;
  canCompleteTask: boolean;
};

type ProcessElementInfo = {
  flow?: number;
  started?: string;
  elementId?: string;
  name?: string;
  altinnTaskType?: string;
  ended?: string;
  validated?: ValidationStatus;
  flowType?: string;
};

type ProcessState = {
  started?: string;
  startEvent?: string;
  currentTask?: ProcessElementInfo;
  ended?: string;
  endEvent?: string;
};

type PlatformUser = {
  userId?: number;
  orgId?: string;
  authenticationLevel: number;
  endUserSystemId?: number;
  nationalIdentityNumber?: string;
  systemUserId?: string;
  systemUserOwnerOrgNo?: string;
  systemUserName?: string;
};

type InstanceEventType =
  | 'None'
  | 'Created'
  | 'Saved'
  | 'Submited'
  | 'Deleted'
  | 'Undeleted'
  | 'ConfirmedComplete'
  | 'SubstatusUpdated'
  | 'process_StartEvent'
  | 'process_EndEvent'
  | 'process_StartTask'
  | 'process_EndTask'
  | 'process_AbandonTask'
  | 'Signed'
  | 'SentToSign'
  | 'SentToPayment'
  | 'SentToSendIn'
  | 'SentToFormFill'
  | 'InstanceForwarded'
  | 'InstanceRightRevoked'
  | 'NotificationSentSms'
  | 'MessageArchived'
  | 'MessageRead';

export type InstanceEvent = {
  id?: string;
  instanceId: string;
  dataId?: string;
  created?: string;
  eventType: InstanceEventType;
  instanceOwnerPartyId: string;
  user?: PlatformUser;
  relatedUser?: PlatformUser;
  processInfo?: ProcessState;
  additionalInfo?: string;
};
