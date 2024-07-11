export type FeedbackTypes = 'featureRequest';
export interface UserFeedback {
  goToFeedbackUrl: (feedbackType: FeedbackTypes) => string;
}
