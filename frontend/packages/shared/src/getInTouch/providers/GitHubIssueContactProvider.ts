import { type GetInTouchProvider } from '../interfaces/GetInTouchProvider';

type GitHubIssueTypes = 'featureRequest' | 'bugReport';

type GitHubChannelConfig = {
  labels: Array<string>;
  template: string;
};

const gitHubIssueType: Record<GitHubIssueTypes, GitHubChannelConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
  bugReport: {
    labels: ['kind/bug', 'status/triage'],
    template: 'bug_report.yml',
  },
};

export class GitHubIssueContactProvider implements GetInTouchProvider<GitHubIssueTypes> {
  private readonly githubRepoUrl: string = 'https://github.com/Altinn/altinn-studio';
  private readonly githubIssueUrl: string = `${this.githubRepoUrl}/issues/new`;

  public buildContactUrl(selectedIssueType: GitHubIssueTypes): string {
    return this.githubIssueUrl + this.optionToUrlParams(gitHubIssueType[selectedIssueType]);
  }

  private optionToUrlParams(selectedConfig: GitHubChannelConfig): string {
    const labels = selectedConfig.labels.join(',');
    return `?assignees=&labels=${labels}&projects=&template=${selectedConfig.template}`;
  }
}
