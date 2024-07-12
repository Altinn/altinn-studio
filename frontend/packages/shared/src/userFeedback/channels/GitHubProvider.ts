import { ContactProvider } from '../interfaces/ContactProvider';

export type GithubChannel = 'featureRequest';

type GitHubChannelConfig = {
  labels: Array<string>;
  template: string;
};

const channelMap: Record<GithubChannel, GitHubChannelConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
};

export class GitHubProvider implements ContactProvider {
  private readonly githubRepoUrl: string = 'https://github.com/Altinn/altinn-studio';
  private readonly githubIssueUrl: string = `${this.githubRepoUrl}/issues/new/`;

  public getFeedbackUrl(selectedChannel: GithubChannel): string {
    return this.githubIssueUrl + this.optionToUrlParams(channelMap[selectedChannel]);
  }

  private optionToUrlParams(selectedConfig: GitHubChannelConfig): string {
    const labels = selectedConfig.labels.join(', ');
    return `?assignees=&labels=${labels}&projects=&template=${selectedConfig.template}`;
  }
}
