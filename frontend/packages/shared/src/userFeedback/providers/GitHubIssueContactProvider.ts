import { ContactProvider } from '../interfaces/ContactProvider';

type GitHubChannel = 'featureRequest' | 'bugReport';

type GitHubChannelConfig = {
  labels: Array<string>;
  template: string;
};

const channelMap: Record<GitHubChannel, GitHubChannelConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
  bugReport: {
    labels: ['kind/bug', 'status/triage'],
    template: 'bug_report.yml',
  },
};

export class GitHubIssueContactProvider implements ContactProvider<GitHubChannel> {
  private readonly githubRepoUrl: string = 'https://github.com/Altinn/altinn-studio';
  private readonly githubIssueUrl: string = `${this.githubRepoUrl}/issues/new/`;

  public buildContactUrl(selectedChannel: GitHubChannel): string {
    const defaultChannel = channelMap['featureRequest'];
    return (
      this.githubIssueUrl + this.optionToUrlParams(channelMap[selectedChannel] || defaultChannel)
    );
  }

  private optionToUrlParams(selectedConfig: GitHubChannelConfig): string {
    const labels = selectedConfig.labels.join(',');
    return `?assignees=&labels=${labels}&projects=&template=${selectedConfig.template}`;
  }
}
