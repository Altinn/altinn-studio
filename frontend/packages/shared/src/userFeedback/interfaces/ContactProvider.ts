export interface ContactProvider<T> {
  getFeedbackUrl: (feedbackType: T) => string;
}
