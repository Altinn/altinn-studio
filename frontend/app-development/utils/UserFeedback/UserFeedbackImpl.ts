import { FeedbackTypes, UserFeedback } from './UserFeedback';

export class UserFeedbackImpl implements UserFeedback {
  constructor(private userFeedback: UserFeedback) {}

  public getFeedbackUrl(feedbackType: FeedbackTypes): string {
    return this.userFeedback.getFeedbackUrl(feedbackType);
  }
}
