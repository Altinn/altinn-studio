// The answer from the assistant service to a start request.
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
