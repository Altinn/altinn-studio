export interface ContactProvider {
  getFeedbackUrl: <T>(feedbackType: T) => string;
}
