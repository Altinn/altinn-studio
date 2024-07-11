type FeedbackTypes = 'featureRequest';

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

export class Feedback {
  private readonly gitUrl: string = 'https://github.com';
  private readonly org: string = 'Altinn';
  private readonly repo: string = 'altinn-studio';

  constructor() {}

  public goToFeedbackUrl(feedbackType: FeedbackTypes = 'featureRequest'): string {
    return this.getGitIssueUrl + this.optionToUrlParams(feedbackTypeMap[feedbackType]);
  }

  private get getGitIssueUrl(): string {
    return `${this.gitUrl}/${this.org}/${this.repo}/issues/new`;
  }

  private optionToUrlParams(feedbackType): string {
    const labels = feedbackType.labels.join(', ');
    return `assignees=&labels=${labels}&projects=&template=${feedbackType.template}`;
  }
}
