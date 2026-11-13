export type FeedbackPayload = {
  thumbsUp: boolean;
  comment?: string;
};

export type UserFeedback = {
  traceId: string;
  payload: FeedbackPayload;
};
