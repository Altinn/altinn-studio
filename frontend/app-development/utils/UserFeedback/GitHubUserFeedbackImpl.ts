import { FeedbackTypes, UserFeedback } from './UserFeedback';

type FeedbackConfig = {
  labels: Array<string>;
  template: string;
};

const feedbackTypeMap: Record<FeedbackTypes, FeedbackConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
};

export class GitHubUserFeedbackImpl implements UserFeedback {
  public goToFeedbackUrl(feedbackType: FeedbackTypes): string {
    return this.getGitHubIssueUrl + this.optionToUrlParams(feedbackTypeMap[feedbackType]);
  }

  private get getGitHubIssueUrl(): string {
    const gitUrl: string = 'https://github.com';
    const org: string = 'Altinn';
    const repo: string = 'altinn-studio';

    return `${gitUrl}/${org}/${repo}/issues/new/`;
  }

  private optionToUrlParams(feedbackType): string {
    const labels = feedbackType.labels.join(', ');
    return `?assignees=&labels=${labels}&projects=&template=${feedbackType.template}`;
  }
}
