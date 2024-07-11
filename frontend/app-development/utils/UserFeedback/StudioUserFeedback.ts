import { UserFeedbackImpl } from './UserFeedbackImpl';
import { GitHubUserFeedbackImpl } from './GitHubUserFeedbackImpl';

export class StudioUserFeedbackImpl {
  public readonly feedback = new UserFeedbackImpl(new GitHubUserFeedbackImpl());
}
