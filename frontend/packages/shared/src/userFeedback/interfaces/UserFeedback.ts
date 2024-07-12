export interface UserFeedback {
  getFeedbackUrl: <T>(feedbackType: T) => string;
}
