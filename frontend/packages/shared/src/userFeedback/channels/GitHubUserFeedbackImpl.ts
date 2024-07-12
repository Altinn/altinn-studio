import { UserFeedback } from '../interfaces/UserFeedback';

export type GithubFeedbackTypes = 'featureRequest';

type FeedbackConfig = {
  labels: Array<string>;
  template: string;
};

const feedbackTypeMap: Record<GithubFeedbackTypes, FeedbackConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
};

export class GitHubUserFeedbackImpl implements UserFeedback {
  private githubRepoUrl: string = 'https://github.com/Altinn/altinn-studio';
  private githubIssueUrl: string = `${this.githubRepoUrl}/issues/new/`;

  public getFeedbackUrl(feedbackType: GithubFeedbackTypes): string {
    return this.githubIssueUrl + this.optionToUrlParams(feedbackTypeMap[feedbackType]);
  }

  private optionToUrlParams(feedbackType): string {
    const labels = feedbackType.labels.join(', ');
    return `?assignees=&labels=${labels}&projects=&template=${feedbackType.template}`;
  }
}
