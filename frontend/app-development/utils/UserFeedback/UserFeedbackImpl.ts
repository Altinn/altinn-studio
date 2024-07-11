import { FeedbackTypes, UserFeedback } from './UserFeedback';

export class UserFeedbackImpl implements UserFeedback {
  constructor(private userFeedback: UserFeedback) {}

  public goToFeedbackUrl(feedbackType: FeedbackTypes): string {
    return this.userFeedback.goToFeedbackUrl(feedbackType);
  }
}
