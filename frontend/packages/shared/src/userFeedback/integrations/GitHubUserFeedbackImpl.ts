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
  public getFeedbackUrl(feedbackType: GithubFeedbackTypes): string {
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
