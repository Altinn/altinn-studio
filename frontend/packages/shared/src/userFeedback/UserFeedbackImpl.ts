import { UserFeedback } from './interfaces/UserFeedback';

export class UserFeedbackImpl implements UserFeedback {
  constructor(private userFeedback: UserFeedback) {}

  public getFeedbackUrl<T>(feedbackType: T): string {
    return this.userFeedback.getFeedbackUrl(feedbackType);
  }
}
