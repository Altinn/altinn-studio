export type FeedbackTypes = 'featureRequest';
export interface UserFeedback {
  getFeedbackUrl: (feedbackType: FeedbackTypes) => string;
}
