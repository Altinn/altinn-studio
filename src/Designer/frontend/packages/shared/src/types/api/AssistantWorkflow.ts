// The assistant service's answer to a start request. An answer that it did not accept explains why.
export type AssistantWorkflowResponse = {
  accepted: boolean;
  session_id: string;
  message: string;
  mode?: 'chat' | 'edit';
  app_name?: string;
  parsed_intent?: {
    suggestions?: string[];
    [key: string]: unknown;
  };
};

export type AssistantPermissionResponsePayload = {
  requestId: string;
  granted: boolean;
};
